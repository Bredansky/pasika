#!/bin/bash
# notification.sh - Cross-platform notification

OS="$(uname -s)"

case "$OS" in
  Darwin*)
    if command -v terminal-notifier &> /dev/null; then
      PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
      TEMP_SCRIPT=$(mktemp)

      cat > "$TEMP_SCRIPT" <<SCRIPTEND
#!/bin/bash
/usr/local/bin/code -r "$PROJECT_DIR"
sleep 0.5
osascript -e 'tell application "Visual Studio Code" to activate'
SCRIPTEND

      chmod +x "$TEMP_SCRIPT"

      terminal-notifier \
        -message "Claude Code needs your attention - Click to focus terminal" \
        -title "Claude Code" \
        -sound Ping \
        -execute "$TEMP_SCRIPT"

      (sleep 60; rm -f "$TEMP_SCRIPT") &
    else
      osascript -e 'display notification "Claude Code needs your attention" with title "Claude Code"'
    fi
    ;;
  Linux*)
    notify-send 'Claude Code' 'Claude Code needs your attention'
    ;;
  MINGW*|MSYS*|CYGWIN*)
    powershell.exe -Command "[System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms'); [System.Windows.Forms.MessageBox]::Show('Claude Code needs your attention', 'Claude Code')"
    ;;
esac
