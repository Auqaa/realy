# QR Photo Scan Regression Checklist

## Devices

- iPhone Safari in the same local network as the dev machine
- Android Chrome in the same local network as the dev machine

## Preconditions

- `backend` is running on `:5000`
- `frontend` is running on `:3000`
- test account can access the app and submit scans
- at least one known valid QR is available on a second screen or printed

## Scenarios

1. On iPhone open the app, tap `Открыть камеру телефона`, take a photo of a valid QR, tap `Use Photo`, verify the scan succeeds.
2. Repeat the same scenario on Android Chrome and verify the same QR succeeds.
3. Take a blurred or glare-heavy photo and verify the app shows a readable retry message instead of a generic failure.
4. After a failed photo attempt, immediately retake another photo and verify the second attempt succeeds without reloading the page.
5. Enter the same QR manually and verify manual fallback still succeeds.
6. Verify live camera scanning still renders and works when the browser/device supports it.
7. Turn the network off, scan through a valid decoded QR path, verify the app queues the scan offline and syncs after the network returns.
