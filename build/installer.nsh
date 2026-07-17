; ── NSIS カスタムスクリプト ──
!macro customUnInstall
  MessageBox MB_YESNO|MB_ICONQUESTION \
    "セーブデータと設定を削除しますか？$\r$\n$\r$\n「いいえ」を選ぶとデータは残ります（再インストール時に復元されます）。" \
    IDNO keepUserData
    RMDir /r "$APPDATA\train-driver-simulator"
  keepUserData:
!macroend
