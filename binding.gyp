{
    "targets": [
        {
            "target_name": "addon",
            "arch": ["arm64", "x64"],
            "sources": [
                "whisper.cpp/whisper.cpp",
                "whisper.cpp/ggml.c",
                "whisper.cpp/ggml-quants.c",
                "whisper.cpp/ggml-alloc.c",
                "whisper.cpp/ggml-backend.c",
                "whisper.cpp/whisper-mel.hpp",
                "cpp/stream_whisper.cc",
                "cpp/addon.cc",
            ],
            "cflags!": ["-fno-exceptions"],
            "cflags_cc!": ["-fno-exceptions"],
            "include_dirs": [
                "<!@(node -p \"require('node-addon-api').include\")",
                "whisper.cpp",
            ],
            "defines": ["NAPI_DISABLE_CPP_EXCEPTIONS"],
            "dependencies": ["<!(node -p \"require('node-addon-api').gyp\")"],
            "conditions": [
                # [
                #     'OS=="win"',
                #     {"msvs_settings": {"VCCLCompilerTool": {"ExceptionHandling": 1}}},
                # ],
                [
                    'OS=="mac"',
                    {
                        "xcode_settings": {
                            "CLANG_CXX_LIBRARY": "libc++",
                            "GCC_ENABLE_CPP_EXCEPTIONS": "YES",
                            "MACOSX_DEPLOYMENT_TARGET": "14.5",
                            "OTHER_CFLAGS": ["-DGGML_USE_ACCELERATE"],
                            "OTHER_LDFLAGS": ["-framework Accelerate"],
                        }
                    },
                ],
            ],
        }
    ]
}
