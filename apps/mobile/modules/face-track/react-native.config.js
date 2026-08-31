// https://github.com/react-native-community/cli/blob/main/docs/dependencies.md
module.exports = {
  dependency: {
    platforms: {
      ios: {},
      // iOS only. Apple Vision is the whole implementation, and this app ships
      // for iOS — see the layout table in CLAUDE.md.
      android: null,
    },
  },
}
