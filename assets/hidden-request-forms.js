;(function () {
  const ALWAYS_HIDDEN_FORM_IDS = ["12270569681167"]
  const SIGNED_IN_ONLY_FORM_IDS = ["26443122488476"]

  const script = document.currentScript
  const signedIn = !!script && script.dataset.signedIn === "true"

  const select = document.getElementById("request_issue_type_select")
  if (!select) return

  // 여기서 select의 option 자체를 지우면, standard 스타일은 물론 boxes/list 스타일의
  // Forms 위젯도(네이티브 select를 읽어 목록을 그리므로) 이 시점 이후엔 손댈 필요 없이
  // 자동으로 걸러진 목록만 보게 된다.
  Array.prototype.slice
    .call(select.querySelectorAll("option"))
    .forEach(function (option) {
      const id = option.value
      if (id === "-") return
      const hide =
        ALWAYS_HIDDEN_FORM_IDS.indexOf(id) !== -1 ||
        (!signedIn && SIGNED_IN_ONLY_FORM_IDS.indexOf(id) !== -1)
      if (hide) option.remove()
    })
})()
