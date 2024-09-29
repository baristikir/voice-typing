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
                [
                    'OS=="win"',
                    {
                        "msvs_settings": {
                            "VCCLCompilerTool": {
                                "ExceptionHandling": 1,
                                "AdditionalOptions": [
                                    "/std:c++17",
                                    "/D_USE_MATH_DEFINES",
                                    "/D_SILENCE_CXX17_CODECVT_HEADER_DEPRECATION_WARNING",
                                    "/DNOMINMAX",
                                    "/O2",
                                    "/GL",
                                    "/Gy",
                                    "/Ob2",
                                    "/arch:AVX2",
                                    "/fp:fast",
                                    "/Qpar",
                                    "/MD"
                                ],
                                "Optimization": 2,
                                "EnableFiberSafeOptimizations": "true",
                                "WholeProgramOptimization": "true" 
                            },
                            "VCLinkerTool": {
                                "LinkTimeCodeGeneration": 1,
                                "OptimizeReferences": 2,
                                "EnableCOMDATFolding": 2
                            }
                        }
                    },
                ],
                [
                    'OS=="mac"',
                    {
                        "xcode_settings": {
                            "CLANG_CXX_LIBRARY": "libc++",
                            "GCC_ENABLE_CPP_EXCEPTIONS": "YES",
                            "MACOSX_DEPLOYMENT_TARGET": "14.5",
                            "OTHER_CFLAGS": [
                                "-DGGML_USE_ACCELERATE",
                                "-O3",
                                "-march=native",
                                "-mtune=native",
                                "-ffast-math",
                                "-fno-finite-math-only",
                                "-fno-rtti",
                                "-DNDEBUG"
                            ],
                            "OTHER_LDFLAGS": ["-framework Accelerate"],
                        }
                    },
                ],
                [
                    'OS=="linux"',
                    {
                        "cflags": [
                            "-O3",
                            "-ffast-math",
                            "-fno-finite-math-only",
                            "-funsafe-math-optimizations",
                            "-fno-rtti",
                            "-fno-exceptions",
                            "-fPIC",
                            "-fopenmp",
                            "-DNDEBUG",
                            "-D_GNU_SOURCE",
                            "-D_XOPEN_SOURCE=600",
                            "-Wall",
                            "-Wextra",
                            "-Wpedantic"
                        ],
                        "cflags_cc": [
                            "-std=c++17",
                            "-O3",
                            "-ffast-math",
                            "-fno-finite-math-only",
                            "-funsafe-math-optimizations",
                            "-fno-rtti",
                            "-fno-exceptions",
                            "-fPIC",
                            "-fopenmp",
                            "-DNDEBUG",
                            "-D_GNU_SOURCE",
                            "-D_XOPEN_SOURCE=600",
                            "-Wall",
                            "-Wextra",
                            "-Wpedantic"
                        ],
                        "ldflags": [
                            "-flto",
                            "-fopenmp"
                        ],
                        "libraries": [
                            "-lgomp"
                        ],
                        "conditions": [
                            [
                                'target_arch=="arm64"',
                                {
                                    "cflags": ["-mcpu=native"],
                                    "cflags_cc": ["-mcpu=native"]
                                }
                            ]
                        ]
                    }
                ]
            ],
        }
    ]
}
