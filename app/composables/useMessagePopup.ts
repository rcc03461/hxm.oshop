export function useMessagePopup() {
  const isOpen = useState<boolean>('oshop-message-popup-open', () => false)

  function openMessagePopup() {
    isOpen.value = true
  }

  function closeMessagePopup() {
    isOpen.value = false
  }

  function toggleMessagePopup() {
    isOpen.value = !isOpen.value
  }

  return {
    isOpen,
    openMessagePopup,
    closeMessagePopup,
    toggleMessagePopup,
  }
}
