{
  "targets": [
    {
      "target_name": "injector",
      "sources": [
        "injector.cc",
        "functions.cc"
      ],
      "include_dirs": [
        "<!(node -e \"require('nan')\")"
      ],
      "msvs_settings": {
        "VCCLCompilerTool": {
          "AdditionalOptions": [
            "-std:c++20"
          ]
        }
      },
      "defines": [
        "NOMINMAX"
      ]
    }
  ],
  "variables": {
    "openssl_fips": ""
  }
}
