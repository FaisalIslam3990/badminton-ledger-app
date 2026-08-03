// Hands a File off from the Add Entry FAB (which triggers the native
// file/camera picker directly) to the Add Entry form on the next route,
// so she isn't asked to tap "Choose file" a second time. Plain module
// state works here because Next's client-side navigation keeps the JS
// runtime alive — this would NOT survive a full page reload, which is
// fine since the FAB is the only thing that ever sets it.
let pendingFile: File | null = null;

export function setPendingReceipt(file: File | null) {
  pendingFile = file;
}

export function takePendingReceipt(): File | null {
  const file = pendingFile;
  pendingFile = null;
  return file;
}
