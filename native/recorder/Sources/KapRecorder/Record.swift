import Aperture
import AVFoundation
import Foundation

// The options Kap sends as JSON (getRecorderOptions in main/utils/screen-recorder.ts).
struct RecordOptions: Decodable {
	let destination: URL
	let framesPerSecond: Int
	// In points from the top-left corner of the screen: [[x, y], [width, height]].
	let cropRect: CGRect?
	let showCursor: Bool
	let highlightClicks: Bool
	let screenId: CGDirectDisplayID
	let audioDeviceId: String?
	let videoCodec: String?
}

struct UnsupportedVideoCodec: LocalizedError {
	let codecID: String

	var errorDescription: String? { "Unsupported video codec: \(codecID)" }
}

// Kap sends AVFoundation codec IDs.
func videoCodec(forCodecID codecID: String?) throws -> Aperture.VideoCodec {
	switch codecID {
	case nil, "avc1":
		return .h264
	case "hvc1":
		return .hevc
	case "apcn":
		return .proRes422
	case "ap4h":
		return .proRes4444
	case let codecID?:
		throw UnsupportedVideoCodec(codecID: codecID)
	}
}

func record(optionsJSON: String) throws {
	let options: RecordOptions = try optionsJSON.jsonDecoded()
	let screenID = options.screenId == 0 ? CGMainDisplayID() : options.screenId

	let recordingOptions = Aperture.RecordingOptions(
		destination: options.destination,
		targetID: String(screenID),
		framesPerSecond: options.framesPerSecond,
		cropRect: options.cropRect,
		showCursor: options.showCursor,
		highlightClicks: options.highlightClicks,
		videoCodec: try videoCodec(forCodecID: options.videoCodec),
		microphoneDeviceID: options.audioDeviceId
	)

	let recorder = Aperture.Recorder()

	recorder.onPause = {
		emit("onPause")
	}

	recorder.onResume = {
		emit("onResume")
	}

	// Aperture reports errors that end the recording here, for example when the screen goes away.
	recorder.onError = { error in
		printToStandardError("Recording failed: \(describe(error))")
		exit(1)
	}

	// Exit only after the file is finished, or the video ends up corrupt.
	var isStopping = false
	let stop = {
		guard !isStopping else {
			return
		}

		isStopping = true
		Task {
			do {
				try await recorder.stop()
				exit(0)
			} catch {
				printToStandardError("Could not finish the recording: \(describe(error))")
				exit(1)
			}
		}
	}

	let stopSignalSources = [SIGTERM, SIGINT].map { signalNumber in
		signal(signalNumber, SIG_IGN)
		let source = DispatchSource.makeSignalSource(signal: signalNumber, queue: .main)
		source.setEventHandler(handler: stop)
		source.resume()
		return source
	}

	// Commands from Kap, one per line. When stdin closes, Kap has gone away, so finish the file.
	Thread.detachNewThread {
		while let command = readLine() {
			DispatchQueue.main.async {
				switch command {
				case "pause":
					do {
						try recorder.pause()
					} catch {
						printToStandardError("Could not pause: \(describe(error))")
					}
				case "resume":
					Task {
						do {
							try await recorder.resume()
						} catch {
							printToStandardError("Could not resume: \(describe(error))")
						}
					}
				case "isPaused":
					emit("isPaused \(recorder.isPaused)")
				default:
					printToStandardError("Unknown command: \(command)")
				}
			}
		}

		DispatchQueue.main.async(execute: stop)
	}

	Task {
		do {
			try await recorder.start(target: .screen, options: recordingOptions)
			emit("onStart")
		} catch {
			printToStandardError("Could not start the recording: \(describe(error))")
			exit(1)
		}
	}

	withExtendedLifetime(stopSignalSources) {
		RunLoop.main.run()
	}
}
