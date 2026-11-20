import Aperture
import Foundation

// kap-recorder records the screen with ScreenCaptureKit for Kap (main/utils/screen-recorder.ts).
//
//   kap-recorder record <options JSON>
//     Records until it gets SIGTERM or stdin closes, then finishes the file and exits.
//     Reads commands from stdin, one per line: pause, resume, isPaused.
//     Writes events to stdout, one per line: onStart, onPause, onResume, isPaused <true|false>.
//     Errors go to stderr, with exit code 1.
//
//   kap-recorder audio-devices
//     Prints the microphones as JSON: [{"id": …, "name": …}].

@main
enum KapRecorder {
	static func main() {
		let arguments = Array(CommandLine.arguments.dropFirst())

		do {
			switch arguments.first {
			case "record" where arguments.count == 2:
				try record(optionsJSON: arguments[1])
			case "audio-devices":
				print(try toJSON(Aperture.Devices.audio().map { ["id": $0.id, "name": $0.name] }))
			default:
				printToStandardError("Usage: kap-recorder record <options JSON>\n       kap-recorder audio-devices")
				exit(64)
			}
		} catch {
			printToStandardError(describe(error))
			exit(1)
		}
	}
}
