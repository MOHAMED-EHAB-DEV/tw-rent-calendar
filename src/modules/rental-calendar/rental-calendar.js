/**
 * Rental Calendar — Vanilla JS Custom Element
 * Replaces the LitElement TypeScript implementation.
 * Registers as <rental-calendar> and as <salla-rental-calendar> via Salla Bundles.
 */
import './rental-calendar.css';

const trans = {
  ar: {
    select_rental_period: "اختر فترة الإيجار",
    duration: "مدة الإيجار",
    days: "أيام",
    select_range_hint: "اختر تاريخ البدء",
    day_selected: "تم تحديد اليوم",
    booked_overlap: "الفترة المختارة تحتوي على أيام محجوزة",
    range_selected: "تم تحديد الفترة",
    unavailable: "المنتج غير متاح في هذه التواريخ",
    select_dates_first: "يرجى اختيار تاريخ البدء والنهاية أولاً",
  },
  en: {
    select_rental_period: "Select rental period",
    duration: "Duration",
    days: "days",
    select_range_hint: "Select start date",
    day_selected: "Day selected",
    booked_overlap: "Selected range overlaps with booked dates",
    range_selected: "Range selected",
    unavailable: "Product unavailable on these dates",
    select_dates_first: "Please select start and end dates first",
  },
};

class RentalCalendar extends HTMLElement {
  // ─── Observed Attributes ────────────────────────────────────────────────────
  static get observedAttributes() {
    return ["product-id", "locale", "calendar-title-ar", "calendar-title-en"];
  }

  constructor() {
    super();

    // State
    this._viewDate = new Date();
    this._viewDate.setDate(1);
    this._selectedStart = null;
    this._selectedEnd = null;
    this._bookedRanges = [];
    this._basePricePerDay = 0;
    this._errorMessage = "";
    this._locale = "ar";

    // Bound listeners for cleanup
    this._clickInterceptor = null;
    this._priceListener = null;
    this._rendered = false;
  }

  // ─── Lifecycle ──────────────────────────────────────────────────────────────
  connectedCallback() {
    // Determine locale
    let lang = this.getAttribute("locale") || document.documentElement.lang || "ar";
    if (lang.length > 2) lang = lang.substring(0, 2);
    this._locale = lang;

    this._render();
    this._rendered = true;

    // Fetch initial price
    const priceDisplays = document.querySelectorAll(".price-wrapper .total-price");
    if (priceDisplays.length > 0) {
      this._basePricePerDay =
        parseFloat(priceDisplays[0].textContent?.replace(/[^\d.]/g, "") || "") || 0;
    }

    // Salla price listener
    if (window?.salla?.product?.event) {
      this._priceListener = window.salla.product.event.onPriceUpdated((res) => {
        if (res?.data?.price !== undefined) {
          this._basePricePerDay = res.data.price;
          setTimeout(() => this._updateDisplayPrice(), 50);
        }
      });
    }

    // Fetch booked dates
    const productId = this.getAttribute("product-id");
    if (productId) {
      this._fetchBookedDates(productId);
    }

    // Wait for Salla options to render, then initialize
    setTimeout(() => this._initSallaOptions(), 1000);

    // Cart button interceptor
    this._clickInterceptor = (e) => {
      const btn = e.target.closest('salla-add-product-button, button[type="submit"]');
      if (btn && btn.closest(".product-form")) {
        if (!this._selectedStart || !this._selectedEnd) {
          e.preventDefault();
          e.stopPropagation();
          this._showError(this._t("select_dates_first"));
        }
      }
    };
    document.addEventListener("click", this._clickInterceptor, true);
  }

  disconnectedCallback() {
    if (this._clickInterceptor) {
      document.removeEventListener("click", this._clickInterceptor, true);
      this._clickInterceptor = null;
    }
    this._priceListener = null;
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (!this._rendered) return;
    if (name === "locale") {
      let lang = newVal || "ar";
      if (lang.length > 2) lang = lang.substring(0, 2);
      this._locale = lang;
    }
    this._render();
  }

  // ─── Translations ───────────────────────────────────────────────────────────
  _t(key, replacements = {}) {
    const localeTrans = trans[this._locale] || trans.ar;
    let text = localeTrans[key] || trans.ar[key] || key;
    Object.entries(replacements).forEach(([k, v]) => {
      text = text.replace(`{${k}}`, String(v));
    });
    return text;
  }

  // ─── Computed Title ─────────────────────────────────────────────────────────
  get _calendarTitle() {
    const customTitle =
      this._locale === "ar"
        ? this.getAttribute("calendar-title-ar")
        : this.getAttribute("calendar-title-en");
    return customTitle && customTitle.trim()
      ? customTitle
      : this._t("select_rental_period");
  }

  // ─── Day Names ──────────────────────────────────────────────────────────────
  get _dayNames() {
    let formatter;
    try {
      formatter = new Intl.DateTimeFormat(this._locale, { weekday: "narrow" });
    } catch {
      formatter = new Intl.DateTimeFormat("en", { weekday: "narrow" });
    }
    const weekStartsOn = this._locale === "ar" ? 6 : 0;
    const tempDate = new Date(2024, 0, 7 + weekStartsOn);
    const names = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(tempDate);
      d.setDate(tempDate.getDate() + i);
      names.push(formatter.format(d));
    }
    return names;
  }

  // ─── Duration ───────────────────────────────────────────────────────────────
  _calculateDuration() {
    if (!this._selectedStart || !this._selectedEnd) return 0;
    const diff = Math.abs(this._selectedEnd.getTime() - this._selectedStart.getTime());
    return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
  }

  // ─── Error Helpers ───────────────────────────────────────────────────────────
  _showError(msg) {
    this._errorMessage = msg;
    const el = this.querySelector(".calendar-error-msg");
    if (el) {
      el.textContent = msg;
      el.classList.remove("hidden");
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  _hideError() {
    this._errorMessage = "";
    const el = this.querySelector(".calendar-error-msg");
    if (el) {
      el.textContent = "";
      el.classList.add("hidden");
    }
  }

  // ─── Fetch Booked Dates ──────────────────────────────────────────────────────
  async _fetchBookedDates(productId) {
    try {
      const res = await fetch(
        `https://medo-store-estajer-backend.hf.space/api/booked-dates?productId=${productId}`
      );
      const data = await res.json();
      this._bookedRanges = data.bookedDates || [];
      this._renderCalendar();
    } catch (err) {
      console.error("Failed to fetch booked dates", err);
    }
  }

  // ─── Init Salla Options ─────────────────────────────────────────────────────
  _initSallaOptions() {
    const labels = Array.from(document.querySelectorAll("label"));
    const optionsToHide = ["تاريخ البدء", "تاريخ الانتهاء", "مدة الإيجار"];

    optionsToHide.forEach((text) => {
      const label = labels.find((l) => l.textContent?.trim().includes(text));
      if (!label) return;
      const container =
        label.closest(".salla-product-options__item") || label.parentElement;
      if (container) container.style.display = "none";
    });
  }

  // ─── Day Click ───────────────────────────────────────────────────────────────
  _handleDayClick(date) {
    this._hideError();

    const hasExistingRange =
      this._selectedStart &&
      this._selectedEnd &&
      this._selectedStart.getTime() !== this._selectedEnd.getTime();

    if (!this._selectedStart || hasExistingRange) {
      this._selectedStart = date;
      this._selectedEnd = date;
    } else {
      if (date.getTime() === this._selectedStart.getTime()) {
        this._selectedStart = null;
        this._selectedEnd = null;
      } else if (date < this._selectedStart) {
        this._selectedStart = date;
        this._selectedEnd = date;
      } else {
        const hasOverlap = this._bookedRanges.some((range) => {
          const start = new Date(range.from);
          const end = new Date(range.to);
          start.setHours(0, 0, 0, 0);
          end.setHours(0, 0, 0, 0);
          return this._selectedStart <= end && date >= start;
        });

        if (hasOverlap) {
          this._showError(this._t("booked_overlap"));
          this._selectedStart = null;
          this._selectedEnd = null;
          this._renderCalendar();
          return;
        }

        this._selectedEnd = date;
      }
    }

    this._updateSallaInputs();
    this._updateDisplayPrice();
    this._renderCalendar();
    this._updateFooter();

    if (this._selectedStart && this._selectedEnd) {
      this._checkAvailability();
    }
  }

  // ─── Change Month ────────────────────────────────────────────────────────────
  _changeMonth(offset) {
    const d = new Date(this._viewDate);
    d.setMonth(d.getMonth() + offset);
    this._viewDate = d;
    this._renderCalendar();
  }

  // ─── Salla Input Helpers ─────────────────────────────────────────────────────
  _setSallaDateOption(labelText, value) {
    if (!value) return;
    const label = Array.from(document.querySelectorAll("label")).find((l) =>
      l.textContent?.trim().includes(labelText)
    );
    if (!label) return;
    const container =
      label.closest(".salla-product-options__item") || label.parentElement;
    const input = container?.querySelector(
      'input[type="date"], input[type="text"]'
    );
    if (input) {
      input.value = value;
      input.dispatchEvent(new Event("change", { bubbles: true }));
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }

  _setSallaSelectOption(labelText, optionText) {
    const label = Array.from(document.querySelectorAll("label")).find((l) =>
      l.textContent?.trim().includes(labelText)
    );
    if (!label) return;
    const container =
      label.closest(".salla-product-options__item") || label.parentElement;
    const select = container?.querySelector("select");
    if (select) {
      const opt = Array.from(select.options).find((o) =>
        o.text.includes(optionText)
      );
      if (opt) {
        select.value = opt.value;
        select.dispatchEvent(new Event("change", { bubbles: true }));
      }
    } else if (container) {
      const choiceLabel = Array.from(container.querySelectorAll("label")).find(
        (l) => l.textContent?.includes(optionText)
      );
      if (choiceLabel) {
        const radio =
          choiceLabel.querySelector('input[type="radio"]') ||
          document.getElementById(choiceLabel.getAttribute("for") || "");
        if (radio) {
          radio.checked = true;
          radio.dispatchEvent(new Event("change", { bubbles: true }));
        }
      }
    }
  }

  _updateSallaInputs() {
    const startStr = this._selectedStart
      ? this._selectedStart.toISOString().split("T")[0]
      : "";
    const endStr = this._selectedEnd
      ? this._selectedEnd.toISOString().split("T")[0]
      : "";

    this._setSallaDateOption("تاريخ البدء", startStr);
    this._setSallaDateOption("تاريخ الانتهاء", endStr);

    const days = this._calculateDuration();
    if (days > 0) {
      let dayName;
      if (days === 1) dayName = "يوم واحد";
      else if (days === 2) dayName = "يومين";
      else if (days >= 3 && days <= 10) dayName = `${days} أيام`;
      else dayName = `${days} يوم`;
      this._setSallaSelectOption("مدة الإيجار", dayName);
    }
  }

  // ─── Price Display ───────────────────────────────────────────────────────────
  _updateDisplayPrice() {
    const days = this._calculateDuration();
    const daysToMultiply = days > 0 ? days : 1;
    document.querySelectorAll(".price-wrapper .total-price").forEach((el) => {
      if (
        this._basePricePerDay > 0 &&
        window.salla &&
        typeof window.salla.money === "function"
      ) {
        el.innerHTML = window.salla.money(
          this._basePricePerDay * daysToMultiply
        );
      }
    });
  }

  // ─── Availability Check ──────────────────────────────────────────────────────
  async _checkAvailability() {
    if (!this._selectedStart || !this._selectedEnd) return;
    const productId = this.getAttribute("product-id");
    if (!productId) return;

    const submitButton = document.querySelector("salla-add-product-button");
    if (submitButton) submitButton.setAttribute("disabled", "true");

    const start = this._selectedStart.toISOString().split("T")[0];
    const end = this._selectedEnd.toISOString().split("T")[0];

    try {
      const res = await fetch(
        `https://medo-store-estajer-backend.hf.space/api/check-availability?productId=${productId}&startDate=${start}&endDate=${end}`
      );
      const data = await res.json();
      if (data.available) {
        if (submitButton) submitButton.removeAttribute("disabled");
        this._hideError();
      } else {
        this._showError(data.message || this._t("unavailable"));
      }
    } catch {
      if (submitButton) submitButton.removeAttribute("disabled");
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────────
  _render() {
    this.innerHTML = this._buildHTML();
    this._bindEvents();
  }

  _buildHTML() {
    return `
      <div class="rental-calendar-container" id="rental-calendar-root">
        <h3 class="calendar-title">${this._escapeHTML(this._calendarTitle)}</h3>
        <div class="rental-calendar">
          ${this._buildCalendarHeader()}
          <div class="calendar-grid">
            ${this._buildCalendarGrid()}
          </div>
        </div>
        <div class="calendar-error-msg${
          this._errorMessage ? "" : " hidden"
        }">${this._escapeHTML(this._errorMessage)}</div>
        <div class="calendar-footer">
          <div class="duration-info">
            ${this._escapeHTML(this._t("duration"))}: <span class="days-count">${this._calculateDuration()}</span> ${this._escapeHTML(this._t("days"))}
          </div>
          <div class="hint-info">
            <span class="calendar-hint">${this._escapeHTML(this._rangeHint())}</span>
          </div>
        </div>
      </div>
    `;
  }

  _rangeHint() {
    if (this._selectedStart && this._selectedEnd) {
      return this._selectedStart.getTime() === this._selectedEnd.getTime()
        ? this._t("day_selected")
        : this._t("range_selected");
    }
    return this._t("select_range_hint");
  }

  _buildCalendarHeader() {
    const isRtl = this._locale === "ar";
    let monthFormatter;
    try {
      monthFormatter = new Intl.DateTimeFormat(this._locale, {
        month: "long",
        year: "numeric",
      });
    } catch {
      monthFormatter = new Intl.DateTimeFormat("en", {
        month: "long",
        year: "numeric",
      });
    }
    const label = monthFormatter.format(this._viewDate);

    const prevIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 19l-7-7 7-7"/></svg>`;
    const nextIcon = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 5l7 7-7 7"/></svg>`;

    return `
      <div class="calendar-header">
        <span class="current-month">${this._escapeHTML(label)}</span>
        <div class="nav-buttons">
          <button type="button" class="prev-month" aria-label="Previous Month">
            ${isRtl ? nextIcon : prevIcon}
          </button>
          <button type="button" class="next-month" aria-label="Next Month">
            ${isRtl ? prevIcon : nextIcon}
          </button>
        </div>
      </div>
    `;
  }

  _buildCalendarGrid() {
    const year = this._viewDate.getFullYear();
    const month = this._viewDate.getMonth();
    const weekStartsOn = this._locale === "ar" ? 6 : 0;
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const firstDay = (firstDayOfMonth - weekStartsOn + 7) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let html = "";

    // Weekday headers
    this._dayNames.forEach((name) => {
      html += `<div class="weekday">${this._escapeHTML(name)}</div>`;
    });

    // Prev month filler
    for (let i = firstDay - 1; i >= 0; i--) {
      html += `<div class="day outside">${prevMonthDays - i}</div>`;
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      const isBooked = this._bookedRanges.some((range) => {
        const s = new Date(range.from);
        const e = new Date(range.to);
        s.setHours(0, 0, 0, 0);
        e.setHours(0, 0, 0, 0);
        return date >= s && date <= e;
      });
      const isDisabled = date < today || isBooked;
      const isToday = date.getTime() === today.getTime();
      const isSelected =
        (this._selectedStart && date.getTime() === this._selectedStart.getTime()) ||
        (this._selectedEnd && date.getTime() === this._selectedEnd.getTime());
      const isInRange =
        this._selectedStart &&
        this._selectedEnd &&
        date > this._selectedStart &&
        date < this._selectedEnd;

      const classes = ["day"];
      if (isToday) classes.push("today");
      if (isDisabled) classes.push("disabled");
      if (isBooked) classes.push("booked");
      if (isSelected) classes.push("selected");
      if (isInRange) classes.push("in-range");

      const dateStr = date.toISOString();
      html += `<div class="${classes.join(" ")}"${
        !isDisabled ? ` data-date="${dateStr}"` : ""
      }>${i}</div>`;
    }

    // Next month filler
    const totalCellsSoFar = firstDay + daysInMonth;
    const remaining = 42 - totalCellsSoFar;
    for (let i = 1; i <= remaining; i++) {
      html += `<div class="day outside">${i}</div>`;
    }

    return html;
  }

  // ─── Partial re-renders (avoid full re-render on date changes) ───────────────
  _renderCalendar() {
    const grid = this.querySelector(".calendar-grid");
    const header = this.querySelector(".calendar-header");
    if (!grid || !header) {
      this._render();
      return;
    }
    // Rebuild header + grid in place
    const headerWrapper = this.querySelector(".rental-calendar");
    if (headerWrapper) {
      headerWrapper.innerHTML =
        this._buildCalendarHeader() +
        `<div class="calendar-grid">${this._buildCalendarGrid()}</div>`;
      this._bindCalendarEvents();
    }
    this._updateFooter();
  }

  _updateFooter() {
    const daysCount = this.querySelector(".days-count");
    const hint = this.querySelector(".calendar-hint");
    if (daysCount) daysCount.textContent = String(this._calculateDuration());
    if (hint) hint.textContent = this._rangeHint();
  }

  // ─── Event Binding ───────────────────────────────────────────────────────────
  _bindEvents() {
    this._bindCalendarEvents();
  }

  _bindCalendarEvents() {
    // Navigation buttons
    this.querySelector(".prev-month")?.addEventListener("click", () =>
      this._changeMonth(-1)
    );
    this.querySelector(".next-month")?.addEventListener("click", () =>
      this._changeMonth(1)
    );

    // Day cells
    this.querySelectorAll(".day[data-date]").forEach((el) => {
      el.addEventListener("click", () => {
        const date = new Date(el.dataset.date);
        this._handleDayClick(date);
      });
    });
  }

  // ─── HTML Escape ─────────────────────────────────────────────────────────────
  _escapeHTML(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
}

// Register as standard custom element
if (!customElements.get("rental-calendar")) {
  customElements.define("rental-calendar", RentalCalendar);
}

// Register with Salla Bundles system
if (typeof RentalCalendar !== "undefined") {
  RentalCalendar.registerSallaComponent("rental-calendar");
}
