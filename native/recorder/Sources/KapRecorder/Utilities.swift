import Aperture
import Foundation

/// Writes one event line to stdout, where Kap reads it.
func emit(_ event: String) {
	FileHandle.standardOutput.write(Data((event + "\n").utf8))
}

func printToStandardError(_ text: String) {
	FileHandle.standardError.write(Data((text + "\n").utf8))
}

/// A readable message. Aperture's errors describe themselves only when cast to their own type.
func describe(_ error: Error) -> String {
	if let error = error as? Aperture.Error {
		return error.localizedDescription
	}

	return error.localizedDescription
}

extension String {
	func jsonDecoded<T: Decodable>() throws -> T {
		try JSONDecoder().decode(T.self, from: Data(utf8))
	}
}

func toJSON(_ value: Any) throws -> String {
	String(decoding: try JSONSerialization.data(withJSONObject: value), as: UTF8.self)
}
