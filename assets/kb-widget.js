// KB 문의 위젯 (Alpine 컴포넌트). article_page.hbs에서만 렌더링되며, 문서 ID/제목은
// #kb-widget의 data-article-* 속성에서, 카테고리/섹션은 Help Center API로 읽어온다.

// fieldIds가 null인 항목은 payload에서 자동 생략된다(코멘트 본문에만 정보 포함).
const KB_TICKET_CONFIG = {
  ticketFormId: 29974037292956, // KB 문의용 티켓 양식 ID

  fieldIds: {
    requestEmail: 25711327467420, // "Request Email" 필드 ID
    inquiryType: 29974031596700, // "Inquiry Type" 필드 ID
    kbDocument: 29974020364316, // "KB Document" 필드 ID (문서 제목)
    kbSection: 29974009625500, // "KB Section" 필드 ID (섹션 > 하위 섹션 경로)
    selectedText: 29977188422172, // "Selected Text" 필드 ID (드래그로 인용한 본문)
    submittedAt: 29973991659292, // "Submitted At" 필드 ID (제출 시각, ISO 8601)
    region: 30197026031132, // "Region" 필드 ID. 문서 카테고리명을 그대로 값으로 쓴다.
  },

  // 드롭다운 옵션의 실제 tag와 정확히 일치해야 한다(불일치 시 필드가 에러 없이 빈 값으로 저장됨).
  inquiryTypeFieldValues: {
    ["Inquiry"]: "kb_inquiry",
    ["Error Report"]: "kb_request_correction",
    ["Content Update Request"]: "kb_additional_content",
  },
}

// 첨부파일 제한: Zendesk 공식 문서(Allowing attachments in tickets) 기준 개별 50MB,
// 아래는 권장 허용 확장자 목록. 개수 상한(5개)은 Zendesk 제한이 아니라 위젯 UX상 임의값.
const KB_MAX_ATTACHMENT_SIZE = 50 * 1024 * 1024 // 50MB
const KB_MAX_ATTACHMENT_COUNT = 5
const KB_ALLOWED_ATTACHMENT_EXTENSIONS = [
  "har",
  "json",
  "3g2",
  "3gp",
  "7z",
  "aac",
  "amr",
  "avi",
  "bmp",
  "csv",
  "doc",
  "docx",
  "eml",
  "gif",
  "heic",
  "heif",
  "ics",
  "jfif",
  "jpeg",
  "jpg",
  "key",
  "log",
  "m4a",
  "m4v",
  "mov",
  "mp3",
  "mp4",
  "mp4a",
  "mpeg",
  "mpg",
  "mpga",
  "neon",
  "numbers",
  "odt",
  "oga",
  "ogg",
  "ogv",
  "opus",
  "pages",
  "pdf",
  "png",
  "pps",
  "ppsx",
  "ppt",
  "pptx",
  "qt",
  "svg",
  "tif",
  "tiff",
  "txt",
  "vcf",
  "wav",
  "webm",
  "webp",
  "wmv",
  "xls",
  "xlsx",
  "xml",
  "yaml",
  "yml",
  "zip",
]

const escapeHtml = (text) =>
  String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")

// html_body는 정제가 가장 약해서 사용자 입력은 이스케이프하고 줄바꿈은 <br>로 바꾼다.
const toHtml = (text) => escapeHtml(text).replace(/\r?\n/g, "<br>")

document.addEventListener("alpine:init", () => {
  Alpine.data("kbWidget", () => ({
    open: false,
    type: "Inquiry",
    title: "",
    description: "",
    submitting: false,
    errorMessage: "",
    titleError: "",
    descriptionError: "",
    successMessage: "",
    // 키는 inquiryTypeFieldValues의 키와 동일해야 한다.
    typeLabels: {
      Inquiry: "문의",
      "Error Report": "오류 제보",
      "Content Update Request": "내용 추가 요청",
    },

    contextTitle: "",
    contextSection: "",
    contextCategory: "",
    _contextPromise: null, // loadArticleContext 진행 중 요청 공유용
    quotedText: "",

    requestAlertMessage: "", // data-request-alert로 넘어오는 제출 완료 토스트 문구
    errorMessages: {}, // data-error-*로 넘어오는 검증/실패 메시지 (아래 init 참고)

    currentUser: null, // /api/v2/users/me 캐시. id/email/authenticity_token(CSRF 토큰) 포함

    // { id, name, size, status: 'uploading'|'done'|'error', token, error }
    attachments: [],
    isDragging: false,

    init() {
      this.contextTitle = this.$root.dataset.articleTitle || ""
      this.loadArticleContext()
      this.requestAlertMessage =
        this.$root.dataset.requestAlert || "문의가 접수되었습니다. 감사합니다."

      const ds = this.$root.dataset
      this.errorMessages = {
        titleRequired: ds.errorTitleRequired || "제목을 입력해주세요.",
        descriptionRequired:
          ds.errorDescriptionRequired || "문의 내용을 입력해주세요.",
        sectionRequired:
          ds.errorSectionRequired ||
          "문서 위치(섹션) 정보를 확인할 수 없습니다. 잠시 후 다시 시도해주세요.",
        uploadPending:
          ds.errorUploadPending ||
          "첨부파일 업로드가 끝날 때까지 잠시 기다려주세요.",
        submitFailed:
          ds.errorSubmitFailed ||
          "문의 등록에 실패했습니다. 잠시 후 다시 시도해주세요.",
        attachmentMaxCount:
          ds.errorAttachmentMaxCount ||
          `첨부파일은 최대 ${KB_MAX_ATTACHMENT_COUNT}개까지 첨부할 수 있습니다.`,
        attachmentType:
          ds.errorAttachmentType || "지원하지 않는 파일 형식입니다.",
        attachmentSize:
          ds.errorAttachmentSize || "파일 용량이 50MB를 초과합니다.",
        attachmentUpload: ds.errorAttachmentUpload || "업로드에 실패했습니다.",
      }

      // 드래그 인용 트리거(아래)가 보내는 이벤트를 받아 위젯을 열고 인용구를 채운다.
      document.addEventListener("kb-widget:quote", (event) => {
        this.quotedText = event.detail.quote
        this.open = true
      })
    },

    toggleOpen() {
      if (this.open) {
        this.closePanel()
      } else {
        this.open = true
      }
    },

    closePanel() {
      this.open = false
      this.titleError = ""
      this.descriptionError = ""
      this.errorMessage = ""
    },

    clearQuote() {
      this.quotedText = ""
    },

    dismissSuccessMessage() {
      this.successMessage = ""
    },

    isUploading() {
      return this.attachments.some((a) => a.status === "uploading")
    },

    queueFiles(fileList) {
      Array.from(fileList || []).forEach((file) => this.uploadAttachment(file))
    },

    removeAttachment(index) {
      this.attachments.splice(index, 1)
    },

    // 업로드 후 token을 받아 comment.uploads에 넣어야 실제로 티켓에 첨부된다.
    async uploadAttachment(file) {
      const extension = (file.name.split(".").pop() || "").toLowerCase()
      const entry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: file.name,
        size: file.size,
        status: "uploading",
        token: null,
        error: "",
      }

      if (this.attachments.length >= KB_MAX_ATTACHMENT_COUNT) {
        entry.status = "error"
        entry.error = this.errorMessages.attachmentMaxCount
        this.attachments.push(entry)
        return
      }
      if (!KB_ALLOWED_ATTACHMENT_EXTENSIONS.includes(extension)) {
        entry.status = "error"
        entry.error = this.errorMessages.attachmentType
        this.attachments.push(entry)
        return
      }
      if (file.size > KB_MAX_ATTACHMENT_SIZE) {
        entry.status = "error"
        entry.error = this.errorMessages.attachmentSize
        this.attachments.push(entry)
        return
      }

      // push 후에는 this.attachments[index]를 통해 값을 바꿔야 UI에 반영된다.
      const index = this.attachments.push(entry) - 1

      try {
        const user = await this.fetchCurrentUser()
        const headers = {
          "Content-Type": file.type || "application/octet-stream",
        }
        if (user && user.authenticity_token) {
          headers["X-CSRF-Token"] = user.authenticity_token
        }

        const res = await fetch(
          `/api/v2/uploads.json?filename=${encodeURIComponent(file.name)}`,
          { method: "POST", headers, body: file },
        )
        if (!res.ok) throw new Error("upload failed")
        const data = await res.json()
        this.attachments[index].token = data.upload.token
        this.attachments[index].status = "done"
      } catch (e) {
        this.attachments[index].status = "error"
        this.attachments[index].error = this.errorMessages.attachmentUpload
      }
    },

    // Help Center API GET. 인증은 세션 쿠키(same-origin)로 이뤄지고, CSRF 토큰은
    // 쓰기 요청과 동일하게 X-CSRF-Token으로 함께 실어 보낸다.
    // locale이 없으면 /api/v2/help_center/{path}로 호출하는데, sections/categories는
    // 이 경로가 Agents 전용이라 반드시 locale을 넘겨야 한다(Show ... by locale만
    // End users/Anonymous 허용). articles는 두 경로 모두 End users/Anonymous 허용.
    async helpCenterGet(path, locale) {
      const user = await this.fetchCurrentUser()
      const headers = { Accept: "application/json" }
      if (user && user.authenticity_token) {
        headers["X-CSRF-Token"] = user.authenticity_token
      }
      const base = locale
        ? `/api/v2/help_center/${locale}`
        : "/api/v2/help_center"
      const res = await fetch(`${base}/${path}.json`, {
        headers,
        credentials: "same-origin",
      })
      if (!res.ok) {
        throw new Error(`${path}.json 조회 실패 (status ${res.status})`)
      }
      return res.json()
    },

    // 카테고리/섹션은 path_steps(브레드크럼브)가 아니라 API로 채운다. path_steps는
    // 보이는 카테고리가 하나뿐이면 카테고리 단계를 생략해서 순서 기반 파싱이 한 칸씩 밀린다.
    // article.section_id → parent_section_id를 거슬러 "섹션 > 하위 섹션"을 만들고,
    // 최상위 섹션의 category_id로 카테고리명(Region)을 얻는다.
    // init과 제출 시점에 중복 호출되므로 진행 중인 요청은 공유하고, 실패 시 재시도할 수 있게 비운다.
    loadArticleContext() {
      if (this.contextSection && this.contextCategory) return Promise.resolve()
      if (this._contextPromise) return this._contextPromise

      this._contextPromise = (async () => {
        const articleId = this.$root.dataset.articleId
        if (!articleId) {
          console.warn(
            "[kb-widget] data-article-id가 비어있어 문서 위치 조회를 건너뜀",
          )
          return
        }
        try {
          // 화면 locale을 모르면 locale 없이 조회한다(articles는 어느 쪽이든 허용).
          const pageLocale = (document.documentElement.lang || "").toLowerCase()
          const { article } = await this.helpCenterGet(
            `articles/${articleId}`,
            pageLocale,
          )
          // 섹션/카테고리는 by-locale 엔드포인트만 End users에게 허용되므로
          // 문서 응답의 locale(실제 표시 언어)을 그대로 넘긴다.
          const locale = (article && article.locale) || pageLocale
          if (!locale) throw new Error("문서 locale을 알 수 없음")

          let sectionId = article && article.section_id
          let section = null
          const names = []
          let guard = 0
          while (sectionId && guard < 5) {
            guard += 1
            ;({ section } = await this.helpCenterGet(
              `sections/${sectionId}`,
              locale,
            ))
            if (!section) break
            names.unshift(section.name)
            sectionId = section.parent_section_id
          }
          if (names.length) this.contextSection = names.join(" > ")

          if (section && section.category_id) {
            const { category } = await this.helpCenterGet(
              `categories/${section.category_id}`,
              locale,
            )
            if (category) this.contextCategory = category.name
          }
        } catch (e) {
          console.error("[kb-widget] 문서 위치(카테고리/섹션) 조회 실패", e)
        } finally {
          this._contextPromise = null
        }
      })()
      return this._contextPromise
    },

    // POST/PUT/DELETE는 이 응답의 authenticity_token을 X-CSRF-Token 헤더로 실어
    // 보내야 "본인이 직접 제출"로 처리된다(없으면 대리 제출 알림이 감).
    async fetchCurrentUser() {
      if (this.currentUser) return this.currentUser
      try {
        const res = await fetch("/api/v2/users/me.json")
        if (!res.ok) return null
        const data = await res.json()
        this.currentUser = (data && data.user) || null
        return this.currentUser
      } catch (e) {
        return null
      }
    },

    buildRequestExtras(user) {
      const extras = {}
      if (KB_TICKET_CONFIG.ticketFormId)
        extras.ticket_form_id = KB_TICKET_CONFIG.ticketFormId

      const fields = []
      const fieldIds = KB_TICKET_CONFIG.fieldIds

      if (fieldIds.requestEmail && user && user.email) {
        fields.push({ id: fieldIds.requestEmail, value: user.email })
      }

      const inquiryTypeValue =
        KB_TICKET_CONFIG.inquiryTypeFieldValues[this.type]
      if (fieldIds.inquiryType && inquiryTypeValue) {
        fields.push({ id: fieldIds.inquiryType, value: inquiryTypeValue })
      }
      if (fieldIds.kbDocument && this.contextTitle) {
        fields.push({ id: fieldIds.kbDocument, value: this.contextTitle })
      }
      if (fieldIds.kbSection && this.contextSection) {
        fields.push({ id: fieldIds.kbSection, value: this.contextSection })
      }
      if (fieldIds.selectedText && this.quotedText) {
        fields.push({ id: fieldIds.selectedText, value: this.quotedText })
      }
      if (fieldIds.submittedAt) {
        fields.push({
          id: fieldIds.submittedAt,
          value: new Date().toISOString(),
        })
      }
      if (fieldIds.region && this.contextCategory) {
        fields.push({ id: fieldIds.region, value: this.contextCategory })
      }

      if (fields.length) extras.fields = fields
      return extras
    },

    async submitRequest() {
      this.titleError = this.title.trim()
        ? ""
        : this.errorMessages.titleRequired
      this.descriptionError = this.description.trim()
        ? ""
        : this.errorMessages.descriptionRequired
      if (this.titleError || this.descriptionError) return

      if (this.isUploading()) {
        this.errorMessage = this.errorMessages.uploadPending
        return
      }

      this.errorMessage = ""
      this.successMessage = ""
      this.submitting = true

      try {
        // 섹션 정보는 모든 문서에 반드시 있어야 하는 값이라, 초기 로드 조회가 진행 중이면
        // 기다리고, 실패했으면 한 번 더 조회한다. 그래도 없으면 제출 자체를 막는다.
        await this.loadArticleContext()
        if (!this.contextSection) {
          this.errorMessage = this.errorMessages.sectionRequired
          return
        }

        const user = await this.fetchCurrentUser()

        const pageUrl = window.location.href
        const rows = [
          ["Knowledge Base Request Type", toHtml(this.typeLabels[this.type])],
        ]
        if (this.contextCategory)
          rows.push(["Region", toHtml(this.contextCategory)])
        rows.push(["KB Section", toHtml(this.contextSection)])
        rows.push([
          "KB Document",
          `<a href="${escapeHtml(pageUrl)}">${toHtml(this.contextTitle || pageUrl)}</a>`,
        ])
        if (this.quotedText)
          rows.push(["Selected Text", toHtml(this.quotedText)])

        // 스타일은 정제로 빠질 수 있어 테두리/여백은 HTML 속성으로 지정한다.
        const bodyHtml =
          `<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse">` +
          `<tr><th align="left"><b>Field</b></th><th align="left"><b>Value</b></th></tr>` +
          rows
            .map(
              ([label, value]) =>
                `<tr><td><b>${label}</b></td><td>${value}</td></tr>`,
            )
            .join("") +
          `</table><br>${toHtml(this.description.trim())}`

        const uploadTokens = this.attachments
          .filter((a) => a.status === "done" && a.token)
          .map((a) => a.token)

        const payload = {
          request: {
            subject: this.title.trim(),
            comment: {
              html_body: bodyHtml,
              ...(uploadTokens.length ? { uploads: uploadTokens } : {}),
            },
            ...this.buildRequestExtras(user),
          },
        }
        if (user && user.id) payload.request.requester_id = user.id

        const headers = { "Content-Type": "application/json" }
        if (user && user.authenticity_token) {
          headers["X-CSRF-Token"] = user.authenticity_token
        }

        const res = await fetch("/api/v2/requests.json", {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        })

        if (!res.ok) throw new Error("request failed")

        this.successMessage = this.requestAlertMessage
        this.title = ""
        this.description = ""
        this.quotedText = ""
        this.attachments = []
      } catch (err) {
        this.errorMessage = this.errorMessages.submitFailed
      } finally {
        this.submitting = false
      }
    },
  }))
})

// 드래그 선택 → 인용 문의 트리거 버튼. article-body-content 안에서 텍스트를 선택하면
// 버튼을 띄우고, 클릭 시 kb-widget:quote 이벤트로 위 kbWidget 컴포넌트를 연다.
;(function () {
  const ARTICLE_BODY_SELECTOR = ".article-body-content"
  let triggerEl = null

  function getTrigger() {
    if (triggerEl) return triggerEl

    // Alpine 컴포넌트 밖이라 $root를 못 쓰므로 #kb-widget의 data 속성을 직접 읽는다.
    const kbWidgetEl = document.getElementById("kb-widget")
    const requestBtnLabel =
      (kbWidgetEl && kbWidgetEl.dataset.requestBtnLabel) || "이 내용 문의하기"

    triggerEl = document.createElement("button")
    triggerEl.type = "button"
    triggerEl.className = "kb-quote-trigger"
    triggerEl.textContent = requestBtnLabel
    triggerEl.hidden = true

    // preventDefault 없으면 버튼 클릭 시 포커스 이동으로 selection이 사라진다.
    triggerEl.addEventListener("mousedown", (event) => {
      event.preventDefault()
    })

    triggerEl.addEventListener("click", () => {
      const quote = triggerEl.dataset.quote || ""
      hideTrigger()
      if (quote) {
        document.dispatchEvent(
          new CustomEvent("kb-widget:quote", { detail: { quote } }),
        )
      }
    })

    document.body.appendChild(triggerEl)
    return triggerEl
  }

  function hideTrigger() {
    if (triggerEl) triggerEl.hidden = true
  }

  function showTriggerForSelection(selection, text) {
    const range = selection.getRangeAt(0)
    const rect = range.getBoundingClientRect()
    if (!rect || (rect.width === 0 && rect.height === 0)) return

    const btn = getTrigger()
    btn.dataset.quote = text
    btn.style.left = `${rect.left + rect.width / 2}px`
    btn.style.top = `${rect.top - 8}px`
    btn.hidden = false
  }

  function isTriggerTarget(target) {
    return Boolean(
      triggerEl && target instanceof Node && triggerEl.contains(target),
    )
  }

  document.addEventListener("mouseup", (event) => {
    // 트리거 버튼 클릭은 버튼 자체 핸들러가 처리한다.
    if (isTriggerTarget(event.target)) return

    const selection = window.getSelection()
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
      hideTrigger()
      return
    }

    const text = selection.toString().trim()
    if (!text) {
      hideTrigger()
      return
    }

    const anchorNode = selection.anchorNode
    const anchorEl =
      anchorNode &&
      (anchorNode.nodeType === 1 ? anchorNode : anchorNode.parentElement)
    if (!anchorEl || !anchorEl.closest(ARTICLE_BODY_SELECTOR)) {
      hideTrigger()
      return
    }

    showTriggerForSelection(selection, text)
  })

  // mouseup만 보면 선택 해제 후에도 버튼이 남는 경우가 있다(중간에서 이벤트가
  // 멈추거나, 창 밖에서 버튼을 떼거나, 터치로 해제하는 경우). 눌리는 즉시 숨긴다.
  document.addEventListener(
    "pointerdown",
    (event) => {
      if (!isTriggerTarget(event.target)) hideTrigger()
    },
    true,
  )

  // 키보드·프로그램적 해제까지 잡는다. 여기서는 숨기기만 하고 띄우지는 않는다.
  document.addEventListener("selectionchange", () => {
    if (!triggerEl || triggerEl.hidden) return
    const selection = window.getSelection()
    if (!selection || selection.isCollapsed || !selection.toString().trim())
      hideTrigger()
  })

  // 스크롤되면 버튼이 선택영역과 어긋나므로 숨긴다 (capture: 중첩 스크롤 컨테이너도 감지).
  document.addEventListener("scroll", hideTrigger, true)
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") hideTrigger()
  })
})()
