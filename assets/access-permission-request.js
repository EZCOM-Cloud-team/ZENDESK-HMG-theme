// Access Permission Request 폼 전용 처리. 로그인 사용자에게 이메일과 설명 기본값을 채운다.
// 비로그인 사용자에게 이 폼을 숨기는 처리는 hidden-request-forms.js가 전담한다.
// 로그인 여부는 new_request_page.hbs가 이 스크립트 태그의 data-signed-in 속성으로 넘겨준다.
;(function () {
  const script = document.currentScript
  const isLoggedIn = !!script && script.dataset.signedIn === "true"
  const EMAIL_FIELD_ID = 26522937033756
  const FORM_ID = "26443122488476"
  const DESC_EDITABLE_SELECTOR =
    '.request_description .ck-editor__editable_inline[contenteditable="true"]'
  const RETRY_INTERVAL_MS = 200
  const MAX_ATTEMPTS = 10

  const DESC_KO = `<p><strong>이름 및 신청 사유, 소속을 작성해주세요</strong></p><ul><li>이름: 김현대</li><li>신청 사유: CCI VOC 운영, 권역 담당자</li><li>소속: 고객센터</li></ul>`
  const DESC_EN = `<p><strong>Enter your name, reason for request, and department/affiliation</strong></p><ul><li>Name: Hyundai Kim</li><li>Purpose: Service Operation</li><li>Affiliation: Customer Contact Center</li></ul>`

  const isPermissionRequestForm = () =>
    new URLSearchParams(window.location.search).get("ticket_form_id") ===
    FORM_ID

  const getCurrentUserInfo = async () => {
    const req = await fetch("/api/v2/users/me")
    const res = await req.json()
    return res?.user || {}
  }

  // 이미 값이 있으면 건드리지 않는다.
  const setEmailFieldValue = (value) => {
    const targetField = document.querySelector(
      `#request_custom_fields_${EMAIL_FIELD_ID}`,
    )
    if (targetField && !targetField.value) targetField.value = value
  }

  // setData가 되는 CKEditor 인스턴스를 우선 쓰고, 못 찾으면 paste 이벤트로 넣는다.
  const writeDescription = (editable, html) => {
    const ckInstance = editable.ckeditorInstance
    if (ckInstance) {
      ckInstance.setData(html)
      return
    }
    editable.focus()
    const dt = new DataTransfer()
    dt.setData("text/html", html)
    dt.setData("text/plain", "")
    editable.dispatchEvent(
      new ClipboardEvent("paste", {
        bubbles: true,
        cancelable: true,
        clipboardData: dt,
      }),
    )
    editable.blur()
  }

  // CKEditor는 DOMContentLoaded 이후에 뜨므로 에디터가 생길 때까지 재시도한다.
  const setDescriptionDefault = (html) => {
    let attempts = 0

    const trySet = () => {
      const editable = document.querySelector(DESC_EDITABLE_SELECTOR)
      if (!editable) return false
      if (editable.textContent.trim()) return true
      writeDescription(editable, html)
      return Boolean(editable.textContent.trim())
    }

    const retry = () => {
      if (!trySet() && ++attempts < MAX_ATTEMPTS)
        setTimeout(retry, RETRY_INTERVAL_MS)
    }
    retry()
  }

  document.addEventListener("DOMContentLoaded", async () => {
    if (!isLoggedIn || !isPermissionRequestForm()) return

    const isKorean = /^\/hc\/ko(\/|$)/.test(window.location.pathname)
    setDescriptionDefault(isKorean ? DESC_KO : DESC_EN)

    const user = await getCurrentUserInfo()
    setEmailFieldValue(user?.email || "")
  })
})()
