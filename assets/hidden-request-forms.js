;(function () {
  const ALWAYS_HIDDEN_FORM_IDS = [
    "12270569681167",
    "29974037292956",
    "31375981033372",
  ]
  const SIGNED_IN_ONLY_FORM_IDS = ["26443122488476"]

  const script = document.currentScript
  const signedIn = !!script && script.dataset.signedIn === "true"

  const select = document.getElementById("request_issue_type_select")
  if (!select) return

  const currentValue = select.value

  // 현재 선택된 옵션을 지우면 브라우저가 다른 옵션으로 재선택하며 change 이벤트가
  // 발생해 다른 양식으로 튕겨나가므로, 현재 선택된 옵션은 숨김 대상이어도 지우지 않는다.
  Array.prototype.slice
    .call(select.querySelectorAll("option"))
    .forEach(function (option) {
      const id = option.value
      if (id === "-" || id === currentValue) return
      const hide =
        ALWAYS_HIDDEN_FORM_IDS.indexOf(id) !== -1 ||
        (!signedIn && SIGNED_IN_ONLY_FORM_IDS.indexOf(id) !== -1)
      if (hide) option.remove()
    })
})()
