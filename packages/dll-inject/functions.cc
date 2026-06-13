#include "functions.h"
#include <SDKDDKVer.h>
#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#define UNICODE // Using unicode - so windows functions take wchars
#include <TlHelp32.h>
#include <AclAPI.h>
#include <wchar.h>
#include <string>
#include <iostream>
#include <codecvt>
#include <fstream>

using namespace v8;

std::string GetLastErrorString()
{
	// Get last error ID, early return of "" if no error
	DWORD errorId = GetLastError();
	if (errorId == 0)
	{
		return std::string();
	}

	// Get Windows-allocated string for error
	LPSTR messageBuffer = nullptr;
	size_t size = FormatMessageA(
		FORMAT_MESSAGE_ALLOCATE_BUFFER | FORMAT_MESSAGE_FROM_SYSTEM | FORMAT_MESSAGE_IGNORE_INSERTS,
		NULL,
		errorId,
		MAKELANGID(LANG_NEUTRAL, SUBLANG_DEFAULT),
		(LPSTR)&messageBuffer,
		0,
		NULL);

	// Copy it into our own string
	std::string message(messageBuffer, size);

	// Free the Win buffer
	LocalFree(messageBuffer);

	return message;
}

static bool winterACLShit(DWORD processId)
{
	HANDLE processHandle = nullptr;

	// Get process handle for specified process id
	processHandle = OpenProcess(
		WRITE_DAC | READ_CONTROL | PROCESS_QUERY_LIMITED_INFORMATION,
		FALSE,
		processId);
	if (processHandle == NULL)
	{
		std::cerr << "Error on OpenProcess for pid " << processId << ": " << GetLastErrorString() << std::endl;

		return false;
	}

	PACL dacl = nullptr;
	if (GetSecurityInfo(
			GetCurrentProcess(),
			SE_KERNEL_OBJECT,
			DACL_SECURITY_INFORMATION,
			nullptr, nullptr,
			&dacl,
			nullptr, nullptr) != ERROR_SUCCESS)
	{
		std::cerr << "Error on GetSecurityInfo: " << GetLastErrorString() << std::endl;

		CloseHandle(processHandle);
		return false;
	}

	if (SetSecurityInfo(
			processHandle,
			SE_KERNEL_OBJECT,
			DACL_SECURITY_INFORMATION | UNPROTECTED_DACL_SECURITY_INFORMATION,
			nullptr, nullptr,
			dacl,
			nullptr) != ERROR_SUCCESS)
	{
		std::cerr << "Error on SetSecurityInfo for pid " << processId << ": " << GetLastErrorString() << std::endl;

		CloseHandle(processHandle);
		return false;
	}

	CloseHandle(processHandle);
	return true;
}

static HANDLE getProcessPID(DWORD pid)
{
	winterACLShit(pid);
	return OpenProcess(PROCESS_ALL_ACCESS, FALSE, pid);
}

static HANDLE getProcess(const char *processName)
{
	wchar_t wProcessName[MAX_PATH];
	mbstate_t mbstate;
	mbsrtowcs_s(NULL, wProcessName, &processName, MAX_PATH, &mbstate);

	// Take a snapshot of processes currently running
	HANDLE runningProcesses = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
	if (runningProcesses == INVALID_HANDLE_VALUE)
	{
		return NULL;
	}

	PROCESSENTRY32 pe;
	pe.dwSize = sizeof(PROCESSENTRY32);

	// Find the desired process
	BOOL res = Process32First(runningProcesses, &pe);
	while (res)
	{
		if (wcscmp(pe.szExeFile, wProcessName) == 0)
		{
			// Found the process
			CloseHandle(runningProcesses);
			HANDLE process = getProcessPID(pe.th32ProcessID);
			if (process == NULL)
			{
				// Process failed to open
				return NULL;
			}
			// Return a handle to this process
			return process;
		}
		res = Process32Next(runningProcesses, &pe);
	}

	// Couldn't find the process
	CloseHandle(runningProcesses);
	return NULL;
}

// Inject a DLL file into the given process
static int injectHandle(HANDLE process, const wchar_t *dllPath)
{
	if (process == NULL)
	{
		// Process is not open
		return 1;
	}

	// Get full DLL path
	if (wcslen(dllPath) == 0)
	{
		// Getting path name failed
		CloseHandle(process);
		return 2;
	}
	else if (wcslen(dllPath) > MAX_PATH)
	{
		// Buffer too small for path name
		CloseHandle(process);
		return 3;
	}

	if (GetFileAttributesW(dllPath) == INVALID_FILE_ATTRIBUTES)
	{
		CloseHandle(process);
		return 7;
	}

	// Get the LoadLibraryA method from the kernel32 dll
	LPVOID LoadLib = (LPVOID)GetProcAddress(GetModuleHandleW(L"kernel32.dll"), "LoadLibraryW");

	// Allocate memory in the processs for the DLL path, and then write it there
	LPVOID remotePathSpace = VirtualAllocEx(process, NULL, (wcslen(dllPath) + 1) * sizeof(wchar_t), MEM_RESERVE | MEM_COMMIT, PAGE_READWRITE);
	if (!remotePathSpace)
	{
		CloseHandle(process);
		// Failed to allocate memory
		return 4;
	}

	if (!WriteProcessMemory(process, remotePathSpace, dllPath, (wcslen(dllPath) + 1) * sizeof(wchar_t), NULL))
	{
		// Failed to write memory
		CloseHandle(process);
		return 5;
	}

	// Load the DLL with CreateRemoteThread + LoadLibraryA
	HANDLE remoteThread = CreateRemoteThread(process, NULL, NULL, (LPTHREAD_START_ROUTINE)LoadLib, (LPVOID)remotePathSpace, NULL, NULL);

	if (remoteThread == NULL)
	{
		// Failed to create remote thread to load the DLL
		CloseHandle(process);
		return 6;
	}

	// Close the handle to the process
	CloseHandle(process);
	return 0;
}

// Returns PID if a process with the given name is running, else -1
int getPIDByNameInternal(const char *processName)
{
	HANDLE process = getProcess(processName);
	if (process == NULL)
	{
		return -1;
	}
	int PID = GetProcessId(process);
	CloseHandle(process);
	return PID;
}

// Inject a DLL file into the process with the given pid
int injectInternalPID(DWORD pid, const wchar_t *dllFile)
{
	return injectHandle(getProcessPID(pid), dllFile);
}

wchar_t *to_wstring(const String::Utf8Value &str)
{
	int len = MultiByteToWideChar(CP_UTF8, NULL, *str, -1, NULL, 0);
	wchar_t *output_buffer = new wchar_t[len + 1];
	if (output_buffer)
	{
		MultiByteToWideChar(CP_UTF8, NULL, *str, -1, output_buffer, len);
		output_buffer[len] = L'\0';
	}

	return output_buffer;
}

NAN_METHOD(injectPID)
{
	if (info.Length() != 2)
	{
		Local<Int32> res = Nan::New<Int32>(8);
		info.GetReturnValue().Set(res);
		return;
	}
	if (!info[0]->IsUint32() || !info[1]->IsString())
	{
		Local<Int32> res = Nan::New(9);
		info.GetReturnValue().Set(res);
		return;
	}

	uint32_t value0 = info[0]->IsUndefined() ? 0 : Nan::To<uint32_t>(info[0]).FromJust();
	DWORD arg0(value0);

	Local<Value> value1;
	(info[1]->ToString(Nan::GetCurrentContext())).ToLocal(&value1);
	String::Utf8Value arg1(Isolate::GetCurrent(), value1);

	if (!(*arg1))
	{
		Local<Int32> res = Nan::New(10);
		info.GetReturnValue().Set(res);
		return;
	}
	wchar_t *dllName = to_wstring(arg1);

	int val = injectInternalPID(arg0, dllName);
	delete[] dllName;

	Local<Int32> res = Nan::New(val);
	info.GetReturnValue().Set(res);
}

NAN_METHOD(getPIDByName)
{

	if (info.Length() != 1)
	{
		return;
	}
	if (!info[0]->IsString())
	{
		return;
	}

	Local<Value> value;

	(info[0]->ToString(Nan::GetCurrentContext())).ToLocal(&value);

	String::Utf8Value arg(Isolate::GetCurrent(), value);

	if (!(*arg))
	{
		return;
	}

	const char *processName = *arg;

	int val = getPIDByNameInternal(processName);

	Local<Int32> res = Nan::New(val);
	info.GetReturnValue().Set(res);
}