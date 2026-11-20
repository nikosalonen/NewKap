// swift-tools-version:6.0
import PackageDescription

// kap-recorder records the screen with ScreenCaptureKit for Kap
// (main/utils/screen-recorder.ts). `pnpm build-recorder` builds it into native/build.
let package = Package(
	name: "KapRecorder",
	platforms: [
		.macOS("26.0")
	],
	products: [
		.executable(name: "kap-recorder", targets: ["KapRecorder"])
	],
	targets: [
		// Aperture 3.0.0 (MIT, github.com/wulkano/Aperture), copied in with fixes marked "Kap:".
		.target(
			name: "Aperture",
			exclude: ["LICENSE"],
			swiftSettings: [
				.swiftLanguageMode(.v5)
			]
		),
		.executableTarget(
			name: "KapRecorder",
			dependencies: ["Aperture"],
			swiftSettings: [
				.swiftLanguageMode(.v5)
			]
		)
	]
)
