// kap-helper answers macOS questions that Electron has no API for.
// Each command prints one JSON value to stdout. `pnpm build-native` builds it for Apple Silicon.
//
//   kap-helper audio-inputs                  {"defaultId": "...", "devices": [{"id", "name", "isBuiltIn"}]}
//   kap-helper windows                       [{"pid", "ownerName", "name", "number", "x", "y", "width", "height", "appPath"}]
//   kap-helper apps-for-extensions gif mp4   {"gif": [{"url", "isDefault"}], "mp4": [...]}

import AppKit
import CoreAudio
import UniformTypeIdentifiers

struct AudioInput: Encodable {
  let id: String
  let name: String
  let isBuiltIn: Bool
}

struct AudioInputs: Encodable {
  let defaultId: String?
  let devices: [AudioInput]
}

struct WindowInfo: Encodable {
  let pid: Int
  let ownerName: String
  let name: String
  let number: Int
  let x: Int
  let y: Int
  let width: Int
  let height: Int
  let appPath: String?
}

struct OpenWithApp: Encodable {
  let url: String
  let isDefault: Bool
}

// MARK: Audio inputs (Core Audio). The device UID is the id aperture records from.

func propertyAddress(_ selector: AudioObjectPropertySelector, scope: AudioObjectPropertyScope = kAudioObjectPropertyScopeGlobal) -> AudioObjectPropertyAddress {
  AudioObjectPropertyAddress(mSelector: selector, mScope: scope, mElement: kAudioObjectPropertyElementMain)
}

func stringProperty(_ objectID: AudioObjectID, _ selector: AudioObjectPropertySelector) -> String? {
  var address = propertyAddress(selector)
  var value: Unmanaged<CFString>?
  var size = UInt32(MemoryLayout<Unmanaged<CFString>?>.size)
  guard AudioObjectGetPropertyData(objectID, &address, 0, nil, &size, &value) == noErr, let value else {
    return nil
  }

  return value.takeRetainedValue() as String
}

func uint32Property(_ objectID: AudioObjectID, _ selector: AudioObjectPropertySelector) -> UInt32? {
  var address = propertyAddress(selector)
  var value: UInt32 = 0
  var size = UInt32(MemoryLayout<UInt32>.size)
  guard AudioObjectGetPropertyData(objectID, &address, 0, nil, &size, &value) == noErr else {
    return nil
  }

  return value
}

func allAudioDeviceIDs() -> [AudioObjectID] {
  let systemObject = AudioObjectID(kAudioObjectSystemObject)
  var address = propertyAddress(kAudioHardwarePropertyDevices)
  var size: UInt32 = 0
  guard AudioObjectGetPropertyDataSize(systemObject, &address, 0, nil, &size) == noErr else {
    return []
  }

  var deviceIDs = [AudioObjectID](repeating: 0, count: Int(size) / MemoryLayout<AudioObjectID>.size)
  guard AudioObjectGetPropertyData(systemObject, &address, 0, nil, &size, &deviceIDs) == noErr else {
    return []
  }

  return deviceIDs
}

func hasInputStreams(_ deviceID: AudioObjectID) -> Bool {
  var address = propertyAddress(kAudioDevicePropertyStreams, scope: kAudioObjectPropertyScopeInput)
  var size: UInt32 = 0
  return AudioObjectGetPropertyDataSize(deviceID, &address, 0, nil, &size) == noErr && size > 0
}

func audioInputs() -> AudioInputs {
  let devices = allAudioDeviceIDs().filter(hasInputStreams).compactMap { deviceID -> AudioInput? in
    guard let uid = stringProperty(deviceID, kAudioDevicePropertyDeviceUID) else {
      return nil
    }

    return AudioInput(
      id: uid,
      name: stringProperty(deviceID, kAudioObjectPropertyName) ?? uid,
      isBuiltIn: uint32Property(deviceID, kAudioDevicePropertyTransportType) == kAudioDeviceTransportTypeBuiltIn
    )
  }

  let defaultDeviceID = uint32Property(AudioObjectID(kAudioObjectSystemObject), kAudioHardwarePropertyDefaultInputDevice)
  let defaultId = defaultDeviceID.flatMap { stringProperty($0, kAudioDevicePropertyDeviceUID) }

  return AudioInputs(defaultId: defaultId, devices: devices)
}

// MARK: Windows. Window titles need Screen Recording access, which Kap has when it records.

func windows() -> [WindowInfo] {
  let options: CGWindowListOption = [.optionOnScreenOnly, .excludeDesktopElements]
  guard let windowList = CGWindowListCopyWindowInfo(options, kCGNullWindowID) as? [[String: Any]] else {
    return []
  }

  return windowList.compactMap { info -> WindowInfo? in
    guard
      info[kCGWindowLayer as String] as? Int == 0,
      (info[kCGWindowAlpha as String] as? Double ?? 1) > 0,
      let pid = info[kCGWindowOwnerPID as String] as? Int,
      let ownerName = info[kCGWindowOwnerName as String] as? String,
      let number = info[kCGWindowNumber as String] as? Int,
      let boundsDictionary = info[kCGWindowBounds as String] as? NSDictionary,
      let bounds = CGRect(dictionaryRepresentation: boundsDictionary as CFDictionary),
      bounds.width > 1, bounds.height > 1
    else {
      return nil
    }

    // Only apps with a Dock icon; this drops menu bar extras and system overlays.
    let app = NSRunningApplication(processIdentifier: pid_t(pid))
    guard app?.activationPolicy == .regular else {
      return nil
    }

    return WindowInfo(
      pid: pid,
      ownerName: ownerName,
      name: info[kCGWindowName as String] as? String ?? "",
      number: number,
      x: Int(bounds.origin.x),
      y: Int(bounds.origin.y),
      width: Int(bounds.width),
      height: Int(bounds.height),
      appPath: app?.bundleURL?.path
    )
  }
}

// MARK: Apps that open a file extension, in the order macOS suggests them.

func appsForExtensions(_ extensions: [String]) -> [String: [OpenWithApp]] {
  var appsByExtension: [String: [OpenWithApp]] = [:]

  for fileExtension in extensions {
    guard let type = UTType(filenameExtension: fileExtension) else {
      appsByExtension[fileExtension] = []
      continue
    }

    let defaultApp = NSWorkspace.shared.urlForApplication(toOpen: type)
    appsByExtension[fileExtension] = NSWorkspace.shared.urlsForApplications(toOpen: type).map {
      OpenWithApp(url: $0.absoluteString, isDefault: $0 == defaultApp)
    }
  }

  return appsByExtension
}

// MARK: Command line

func printJSON<Value: Encodable>(_ value: Value) {
  do {
    let data = try JSONEncoder().encode(value)
    FileHandle.standardOutput.write(data)
    FileHandle.standardOutput.write(Data("\n".utf8))
  } catch {
    FileHandle.standardError.write(Data("Could not encode JSON: \(error)\n".utf8))
    exit(1)
  }
}

let arguments = Array(CommandLine.arguments.dropFirst())

switch arguments.first {
case "audio-inputs":
  printJSON(audioInputs())
case "windows":
  printJSON(windows())
case "apps-for-extensions":
  printJSON(appsForExtensions(Array(arguments.dropFirst())))
default:
  FileHandle.standardError.write(Data("Usage: kap-helper audio-inputs | windows | apps-for-extensions <extension>...\n".utf8))
  exit(2)
}
