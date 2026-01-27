// Shared state for update mutex
// This module maintains the in-memory flag for concurrent update prevention

let isUpdating = false;

export function getUpdateStatus(): boolean {
  return isUpdating;
}

export function setUpdateStatus(status: boolean): void {
  isUpdating = status;
}
