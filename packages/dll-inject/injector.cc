#include "functions.h"

using v8::FunctionTemplate;
using namespace Nan;

NAN_MODULE_INIT(InitAll)
{
	Set(target, New("injectPID").ToLocalChecked(), GetFunction(New<FunctionTemplate>(injectPID)).ToLocalChecked());
	Set(target, New("getPIDByName").ToLocalChecked(), GetFunction(New<FunctionTemplate>(getPIDByName)).ToLocalChecked());
}

NODE_MODULE(injector, InitAll)