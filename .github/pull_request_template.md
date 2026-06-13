## Summary

- 

## User Impact

- 

## Validation

- [ ] `npm run build`
- [ ] `cd src-tauri && cargo check`
- [ ] `cd src-tauri && cargo test`
- [ ] Manual checks, if applicable:

## Checklist

- [ ] This PR is focused on one change.
- [ ] I did not include unrelated formatting, generated-file, lockfile, or dependency changes.
- [ ] Any lockfile change is explained in the summary.
- [ ] UI text is covered in both `src/i18n/zh-CN.js` and `src/i18n/en-US.js` when needed.
- [ ] Tauri CSP changes preserve required app protocols such as `ipc:`, `http://ipc.localhost`, `asset:`, and `http://asset.localhost` when local assets or IPC are used.
- [ ] Version numbers are updated only when this PR is intended to create an app release.
