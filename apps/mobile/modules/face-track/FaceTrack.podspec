require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "FaceTrack"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.license      = "UNLICENSED"
  s.authors      = "Loxa"
  s.homepage     = "https://loxa.app"

  s.platforms    = { :ios => min_ios_version_supported }
  s.source       = { :path => "." }

  s.source_files = [
    "ios/**/*.{swift}",
    "ios/**/*.{m,mm}",
  ]

  # Vision is a system framework: it ships a full arm64 simulator slice, which
  # is exactly what the MLKit binary this replaces did not. See the note at the
  # top of src/face/geometry.ts.
  s.frameworks = "Vision", "CoreVideo", "CoreMedia"

  load 'nitrogen/generated/ios/FaceTrack+autolinking.rb'
  add_nitrogen_files(s)

  s.dependency 'React-jsi'
  s.dependency 'React-callinvoker'
  install_modules_dependencies(s)
end
