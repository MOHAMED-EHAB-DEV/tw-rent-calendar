import { LitElement as A, css as C, html as m } from "lit";
import { property as f, state as u } from "lit/decorators.js";
var q = Object.defineProperty, p = (w, e, r, i) => {
  for (var a = void 0, s = w.length - 1, t; s >= 0; s--)
    (t = w[s]) && (a = t(e, r, a) || a);
  return a && q(e, r, a), a;
};
const b = {
  ar: {
    select_rental_period: "اختر فترة الإيجار",
    duration: "مدة الإيجار",
    days: "أيام",
    select_range_hint: "اختر تاريخ البدء",
    day_selected: "تم تحديد اليوم",
    select_start_date: "اختر تاريخ البدء",
    booked_overlap: "الفترة المختارة تحتوي على أيام محجوزة",
    range_selected: "تم تحديد الفترة",
    select_package: "اختر الباقة",
    unavailable: "المنتج غير متاح في هذه التواريخ",
    select_dates_first: "يرجى اختيار تاريخ البدء والنهاية أولاً",
    day_name_1: "يوم واحد",
    day_name_2: "يومين",
    day_name_plural: "{days} أيام",
    day_name_singular: "{days} يوم"
  },
  en: {
    select_rental_period: "Select rental period",
    duration: "Duration",
    days: "days",
    select_range_hint: "Select start date",
    day_selected: "Day selected",
    select_start_date: "Select start date",
    booked_overlap: "Selected range overlaps with booked dates",
    range_selected: "Range selected",
    select_package: "Select Package",
    unavailable: "Product unavailable on these dates",
    select_dates_first: "Please select start and end dates first",
    day_name_1: "1 day",
    day_name_2: "2 days",
    day_name_plural: "{days} days",
    day_name_singular: "{days} day"
  }
}, v = class v extends A {
  constructor() {
    super(...arguments), this.locale = "ar", this.viewDate = /* @__PURE__ */ new Date(), this.selectedStart = null, this.selectedEnd = null, this.bookedRanges = [], this.basePricePerDay = 0, this.errorMessage = "", this.isPackageMode = !1, this.packageOptions = [], this.selectedPackageValue = "";
  }
  get calendarTitle() {
    const e = this.locale === "ar" ? this.calendarTitleAr : this.calendarTitleEn;
    return e && e.trim() ? e : this.isPackageMode ? this.t("select_package") : this.t("select_rental_period");
  }
  connectedCallback() {
    var i, a, s;
    super.connectedCallback(), this.viewDate.setDate(1);
    let e = this.locale || document.documentElement.lang || "ar";
    e.length > 2 && (e = e.substring(0, 2)), this.locale = e, setTimeout(() => this.initSallaOptions(), 1e3);
    const r = document.querySelectorAll(".price-wrapper .total-price");
    r.length > 0 && (this.basePricePerDay = parseFloat(((i = r[0].textContent) == null ? void 0 : i.replace(/[^\d.]/g, "")) || "") || 0), (s = (a = window == null ? void 0 : window.salla) == null ? void 0 : a.product) != null && s.event && (this._priceListener = window.salla.product.event.onPriceUpdated((t) => {
      t && t.data && t.data.price !== void 0 && (this.basePricePerDay = t.data.price, setTimeout(() => this.updateDisplayPrice(), 50));
    })), this.productId && this.fetchBookedDates(), this._clickInterceptor = (t) => {
      const o = t.target.closest('salla-add-product-button, button[type="submit"]');
      o && o.closest(".product-form") && (!this.selectedStart || !this.selectedEnd) && (t.preventDefault(), t.stopPropagation(), this.showError(this.t("select_dates_first")));
    }, document.addEventListener("click", this._clickInterceptor, !0);
  }
  disconnectedCallback() {
    super.disconnectedCallback(), this._clickInterceptor && document.removeEventListener("click", this._clickInterceptor, !0), this._priceListener = null;
  }
  t(e, r = {}) {
    let a = (b[this.locale] || b.ar)[e] || b.ar[e] || e;
    return Object.entries(r).forEach(([s, t]) => {
      a = a.replace(`{${s}}`, String(t));
    }), a;
  }
  showError(e) {
    this.errorMessage = e, setTimeout(() => {
      var i;
      const r = (i = this.shadowRoot) == null ? void 0 : i.getElementById("calendar-error-msg");
      r && r.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 50);
  }
  hideError() {
    this.errorMessage = "";
  }
  async fetchBookedDates() {
    try {
      const r = await (await fetch(
        `https://medo-store-estajer-backend.hf.space/api/booked-dates?productId=${this.productId}`
      )).json();
      this.bookedRanges = r.bookedDates || [];
    } catch (e) {
      console.error("Failed to fetch booked dates", e);
    }
  }
  initSallaOptions() {
    const e = Array.from(document.querySelectorAll("label")), r = [
      "تاريخ البدء",
      "تاريخ الانتهاء",
      "مدة الإيجار",
      "الباقات"
    ];
    let i = null;
    if (r.forEach((a) => {
      const s = e.find((t) => {
        var o;
        return (o = t.textContent) == null ? void 0 : o.trim().includes(a);
      });
      if (s) {
        const t = s.closest(".salla-product-options__item") || s.parentElement;
        t && (t.style.display = "none"), a === "الباقات" && (i = t);
      }
    }), i) {
      this.isPackageMode = !0;
      const a = Array.from(i == null ? void 0 : i.querySelectorAll('input[type="radio"]')), s = [];
      if (a.length > 0)
        a.forEach((t) => {
          var h;
          const o = (i == null ? void 0 : i.querySelector(`label[for="${t.id}"]`)) || t.closest("label");
          let c = o ? (h = o.textContent) == null ? void 0 : h.trim() : t.value;
          c = c.split("(")[0].trim(), s.push({ value: t.value, name: c, el: t, type: "radio" });
        });
      else {
        const t = i == null ? void 0 : i.querySelector("select");
        t && Array.from(t.options).forEach((o) => {
          if (o.value) {
            let c = o.text.trim().split("(")[0].trim();
            s.push({ value: o.value, name: c, el: o, type: "select", parentSelect: t });
          }
        });
      }
      this.packageOptions = s;
    }
  }
  handlePackageClick(e) {
    this.selectedPackageValue = e.value, e.type === "radio" ? (e.el.checked = !0, e.el.dispatchEvent(new Event("change", { bubbles: !0 }))) : e.type === "select" && (e.parentSelect.value = e.value, e.parentSelect.dispatchEvent(new Event("change", { bubbles: !0 })));
    const r = /* @__PURE__ */ new Date(), i = r.toISOString().split("T")[0];
    let a = 1;
    if (e.name.includes("أسبوع") || e.name.toLowerCase().includes("week")) a = 7;
    else if (e.name.includes("شهر") || e.name.toLowerCase().includes("month")) a = 30;
    else if (e.name.includes("سنة") || e.name.toLowerCase().includes("year")) a = 365;
    else {
      const o = e.name.match(/\d+/);
      o && (a = parseInt(o[0]));
    }
    const s = /* @__PURE__ */ new Date();
    s.setDate(r.getDate() + a - 1);
    const t = s.toISOString().split("T")[0];
    this.selectedStart = r, this.selectedEnd = s, this.setSallaDateOption("تاريخ البدء", i), this.setSallaDateOption("تاريخ الانتهاء", t), this.hideError(), this.updateDisplayPrice();
  }
  setSallaDateOption(e, r) {
    if (!r) return;
    const a = Array.from(document.querySelectorAll("label")).find((s) => {
      var t;
      return (t = s.textContent) == null ? void 0 : t.trim().includes(e);
    });
    if (a) {
      const s = a.closest(".salla-product-options__item") || a.parentElement, t = s == null ? void 0 : s.querySelector('input[type="date"], input[type="text"]');
      t && (t.value = r, t.dispatchEvent(new Event("change", { bubbles: !0 })), t.dispatchEvent(new Event("input", { bubbles: !0 })));
    }
  }
  setSallaSelectOption(e, r) {
    const a = Array.from(document.querySelectorAll("label")).find((s) => {
      var t;
      return (t = s.textContent) == null ? void 0 : t.trim().includes(e);
    });
    if (a) {
      const s = a.closest(".salla-product-options__item") || a.parentElement, t = s == null ? void 0 : s.querySelector("select");
      if (t) {
        const o = Array.from(t.options).find((c) => c.text.includes(r));
        o && (t.value = o.value, t.dispatchEvent(new Event("change", { bubbles: !0 })));
      } else if (s) {
        const c = Array.from(s.querySelectorAll("label")).find((h) => {
          var g;
          return (g = h.textContent) == null ? void 0 : g.includes(r);
        });
        if (c) {
          const h = c.querySelector('input[type="radio"]') || document.getElementById(c.getAttribute("for") || "");
          h && (h.checked = !0, h.dispatchEvent(new Event("change", { bubbles: !0 })));
        }
      }
    }
  }
  calculateDuration() {
    if (!this.selectedStart || !this.selectedEnd) return 0;
    const e = Math.abs(this.selectedEnd.getTime() - this.selectedStart.getTime());
    return Math.ceil(e / (1e3 * 60 * 60 * 24)) + 1;
  }
  updateDisplayPrice() {
    const e = this.calculateDuration(), r = e > 0 ? e : 1;
    document.querySelectorAll(".price-wrapper .total-price").forEach((a) => {
      this.basePricePerDay > 0 && window.salla && typeof window.salla.money == "function" && (a.innerHTML = window.salla.money(this.basePricePerDay * r));
    });
  }
  async checkAvailability() {
    if (!this.selectedStart || !this.selectedEnd) return !1;
    const e = document.querySelector("salla-add-product-button");
    if (!e) return !1;
    e.setAttribute("disabled", "true");
    const r = this.selectedStart.toISOString().split("T")[0], i = this.selectedEnd.toISOString().split("T")[0];
    try {
      const a = `https://medo-store-estajer-backend.hf.space/api/check-availability?productId=${this.productId}&startDate=${r}&endDate=${i}`, t = await (await fetch(a)).json();
      return t.available ? (e.removeAttribute("disabled"), this.hideError(), !0) : (this.showError(t.message || this.t("unavailable")), !1);
    } catch (a) {
      return console.error("Failed to check availability", a), e.removeAttribute("disabled"), !0;
    }
  }
  handleDayClick(e) {
    if (this.hideError(), !this.selectedStart || this.selectedStart && this.selectedEnd && this.selectedStart.getTime() !== this.selectedEnd.getTime())
      this.selectedStart = e, this.selectedEnd = e;
    else if (e.getTime() === this.selectedStart.getTime())
      this.selectedStart = null, this.selectedEnd = null;
    else if (e < this.selectedStart)
      this.selectedStart = e, this.selectedEnd = e;
    else {
      if (this.bookedRanges.some((i) => {
        const a = new Date(i.from), s = new Date(i.to);
        return a.setHours(0, 0, 0, 0), s.setHours(0, 0, 0, 0), this.selectedStart <= s && e >= a;
      })) {
        this.showError(this.t("booked_overlap")), this.selectedStart = null, this.selectedEnd = null;
        return;
      }
      this.selectedEnd = e;
    }
    this.updateSallaInputs(), this.updateDisplayPrice(), this.selectedStart && this.selectedEnd && this.checkAvailability();
  }
  updateSallaInputs() {
    const e = this.selectedStart ? this.selectedStart.toISOString().split("T")[0] : "", r = this.selectedEnd ? this.selectedEnd.toISOString().split("T")[0] : "";
    this.setSallaDateOption("تاريخ البدء", e), this.setSallaDateOption("تاريخ الانتهاء", r);
    const i = this.calculateDuration();
    if (i > 0) {
      let a = "";
      i === 1 ? a = "يوم واحد" : i === 2 ? a = "يومين" : i >= 3 && i <= 10 ? a = `${i} أيام` : a = `${i} يوم`, this.setSallaSelectOption("مدة الإيجار", a);
    }
  }
  changeMonth(e) {
    const r = new Date(this.viewDate);
    r.setMonth(r.getMonth() + e), this.viewDate = r;
  }
  get dayNames() {
    let e;
    try {
      e = new Intl.DateTimeFormat(this.locale, { weekday: "narrow" });
    } catch {
      e = new Intl.DateTimeFormat("en", { weekday: "narrow" });
    }
    const r = [], i = this.locale === "ar" ? 6 : 0, a = new Date(2024, 0, 7 + i);
    for (let s = 0; s < 7; s++) {
      const t = new Date(a);
      t.setDate(a.getDate() + s), r.push(e.format(t));
    }
    return r;
  }
  render() {
    if (this.isPackageMode)
      return m`
        <div class="rental-calendar-container">
          <h3 class="calendar-title">${this.calendarTitle}</h3>
          <div class="packages-grid">
            ${this.packageOptions.map(
        (n) => m`
                <div
                  class="package-card ${this.selectedPackageValue === n.value ? "selected" : ""}"
                  @click="${() => this.handlePackageClick(n)}"
                >
                  <span class="package-title">${n.name}</span>
                </div>
              `
      )}
          </div>
          <div id="calendar-error-msg" class="calendar-error-msg ${this.errorMessage ? "" : "hidden"}">
            ${this.errorMessage}
          </div>
        </div>
      `;
    const e = this.viewDate.getFullYear(), r = this.viewDate.getMonth(), i = this.locale === "ar" ? 6 : 0, s = (new Date(e, r, 1).getDay() - i + 7) % 7, t = new Date(e, r + 1, 0).getDate(), o = new Date(e, r, 0).getDate(), c = /* @__PURE__ */ new Date();
    c.setHours(0, 0, 0, 0);
    const h = [];
    for (let n = s - 1; n >= 0; n--)
      h.push({
        dayNum: o - n,
        isOutside: !0,
        date: null
      });
    for (let n = 1; n <= t; n++) {
      const d = new Date(e, r, n), _ = this.bookedRanges.some((E) => {
        const T = new Date(E.from), x = new Date(E.to);
        return T.setHours(0, 0, 0, 0), x.setHours(0, 0, 0, 0), d >= T && d <= x;
      }), O = d < c || _;
      h.push({
        dayNum: n,
        isOutside: !1,
        date: d,
        isToday: d.getTime() === c.getTime(),
        isDisabled: O,
        isBooked: _,
        isSelected: this.selectedStart && d.getTime() === this.selectedStart.getTime() || this.selectedEnd && d.getTime() === this.selectedEnd.getTime(),
        isInRange: this.selectedStart && this.selectedEnd && d > this.selectedStart && d < this.selectedEnd
      });
    }
    const P = 42 - (s + t);
    for (let n = 1; n <= P; n++)
      h.push({
        dayNum: n,
        isOutside: !0,
        date: null
      });
    let y;
    try {
      y = new Intl.DateTimeFormat(this.locale, {
        month: "long",
        year: "numeric"
      });
    } catch {
      y = new Intl.DateTimeFormat("en", {
        month: "long",
        year: "numeric"
      });
    }
    const M = y.format(this.viewDate), $ = this.calculateDuration(), I = this.selectedStart && this.selectedEnd ? this.selectedStart.getTime() === this.selectedEnd.getTime() ? this.t("day_selected") : this.t("range_selected") : this.t("select_range_hint"), k = this.locale === "ar", S = m`
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M15 19l-7-7 7-7" />
      </svg>
    `, D = m`
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M9 5l7 7-7 7" />
      </svg>
    `;
    return m`
      <div class="rental-calendar-container" id="rental-calendar-root">
        <h3 class="calendar-title">${this.calendarTitle}</h3>

        <div class="rental-calendar">
          <!-- Header -->
          <div class="calendar-header">
            <span class="current-month">${M}</span>
            <div class="nav-buttons">
              <button type="button" @click="${() => this.changeMonth(-1)}" aria-label="Previous Month">
                ${k ? D : S}
              </button>
              <button type="button" @click="${() => this.changeMonth(1)}" aria-label="Next Month">
                ${k ? S : D}
              </button>
            </div>
          </div>

          <!-- Grid -->
          <div class="calendar-grid">
            ${this.dayNames.map((n) => m`<div class="weekday">${n}</div>`)}
            ${h.map((n) => {
      if (n.isOutside)
        return m`<div class="day outside">${n.dayNum}</div>`;
      const d = [];
      return n.isToday && d.push("today"), n.isDisabled && d.push("disabled"), n.isBooked && d.push("booked"), n.isSelected && d.push("selected"), n.isInRange && d.push("in-range"), m`
                <div
                  class="day ${d.join(" ")}"
                  @click="${() => !n.isDisabled && this.handleDayClick(n.date)}"
                >
                  ${n.dayNum}
                </div>
              `;
    })}
          </div>
        </div>

        <!-- Error Message -->
        <div id="calendar-error-msg" class="calendar-error-msg ${this.errorMessage ? "" : "hidden"}">
          ${this.errorMessage}
        </div>

        <!-- Footer -->
        <div class="calendar-footer">
          <div class="duration-info">
            ${this.t("duration")}: <span>${$}</span> ${this.t("days")}
          </div>
          <div class="hint-info">
            <span>${I}</span>
          </div>
        </div>


      </div>
    `;
  }
};
v.styles = C`
    :host {
      display: block;
      font-family: inherit;
    }
    .rental-calendar-container {
      margin-top: 1rem;
      margin-bottom: 1.5rem;
    }
    .calendar-title {
      font-size: 1.125rem;
      font-weight: 700;
      margin-bottom: 0.75rem;
      padding-left: 0.25rem;
      padding-right: 0.25rem;
      color: #1f2937;
    }
    .rental-calendar {
      width: 100%;
      background-color: #ffffff;
      border-radius: 2rem;
      padding: 1rem;
      border: 1px solid #e5e7eb;
      box-sizing: border-box;
    }
    @media (min-width: 768px) {
      .rental-calendar {
        padding: 1.5rem;
      }
    }
    .calendar-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
      padding-left: 0.5rem;
      padding-right: 0.5rem;
    }
    .current-month {
      font-size: 1.1rem;
      font-weight: 600;
      color: #1f2937;
    }
    .nav-buttons {
      display: flex;
      gap: 0.5rem;
    }
    .nav-buttons button {
      width: 2rem;
      height: 2rem;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: #eaeef3;
      border: none;
      border-radius: 0.5rem;
      opacity: 0.7;
      cursor: pointer;
      transition: opacity 0.2s;
      color: #4b5563;
    }
    .nav-buttons button:hover {
      opacity: 1;
    }
    .calendar-grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 0.25rem;
    }
    .weekday {
      text-align: center;
      font-size: 0.7rem;
      font-weight: 500;
      color: #9ca3af;
      padding-bottom: 0.5rem;
      text-transform: uppercase;
    }
    .day {
      aspect-ratio: 1 / 1;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.875rem;
      border-radius: 0.5rem;
      cursor: pointer;
      transition: all 0.2s;
      position: relative;
      z-index: 1;
      color: #374151;
      user-select: none;
    }
    @media (min-width: 768px) {
      .day {
        font-size: 1rem;
      }
    }
    .day.outside {
      color: #d1d5db;
      pointer-events: none;
      opacity: 0.5;
    }
    .day.disabled {
      color: #e5e7eb;
      pointer-events: none;
    }
    .day.disabled.booked {
      opacity: 0.3;
    }
    .day.disabled.booked::after {
      content: "";
      position: absolute;
      width: 50%;
      height: 1.5px;
      background-color: #9ca3af;
      transform: rotate(-45deg);
      top: 50%;
      left: 25%;
    }
    :host([dir="rtl"]) .day.disabled.booked::after {
      right: 25%;
      left: auto;
    }
    .day.today {
      color: var(--color-primary, #008060);
      font-weight: bold;
      background-color: #f9fafb;
    }
    .day.selected {
      background-color: var(--color-primary, #008060);
      color: #ffffff;
      font-weight: 600;
      border-radius: 0.5rem;
      z-index: 2;
    }
    .day.in-range {
      background-color: #f3f4f6;
    }
    .day:hover:not(.outside):not(.disabled):not(.selected) {
      background-color: #f3f4f6;
    }
    .calendar-error-msg {
      color: #ef4444;
      font-size: 0.875rem;
      margin-top: 0.5rem;
      padding-left: 0.25rem;
      padding-right: 0.25rem;
      font-weight: 700;
    }
    .calendar-error-msg.hidden {
      display: none;
    }
    .calendar-footer {
      margin-top: 1rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.875rem;
      border-top: 1px solid #f3f4f6;
      padding-top: 1rem;
      padding-left: 0.25rem;
      padding-right: 0.25rem;
    }
    .duration-info {
      color: #4b5563;
    }
    .duration-info span {
      font-weight: 700;
      color: var(--color-primary, #008060);
    }
    .hint-info {
      font-size: 0.75rem;
      color: #9ca3af;
      font-style: italic;
    }
    .min-days-hint {
      font-size: 0.75rem;
      color: #d97706;
      font-weight: 600;
      padding-left: 0.25rem;
      padding-right: 0.25rem;
      margin-top: 0.25rem;
    }
    .packages-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 0.75rem;
      padding-left: 0.25rem;
      padding-right: 0.25rem;
      padding-bottom: 1rem;
    }
    @media (min-width: 768px) {
      .packages-grid {
        grid-template-columns: repeat(3, 1fr);
      }
    }
    .package-card {
      cursor: pointer;
      border: 2px solid #f3f4f6;
      border-radius: 0.5rem;
      padding: 0.75rem;
      text-align: center;
      transition: all 0.2s;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      height: 5rem;
      box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
      background-color: #ffffff;
      box-sizing: border-box;
    }
    .package-card:hover {
      border-color: var(--color-primary, #008060);
    }
    .package-card.selected {
      border-color: var(--color-primary, #008060);
      background-color: #f0fdf4;
    }
    .package-title {
      font-weight: 700;
      color: #1f2937;
    }
  `;
let l = v;
p([
  f({ type: String, attribute: "product-id" })
], l.prototype, "productId");
p([
  f({ type: String })
], l.prototype, "locale");
p([
  f({ type: String, attribute: "calendar-title-ar" })
], l.prototype, "calendarTitleAr");
p([
  f({ type: String, attribute: "calendar-title-en" })
], l.prototype, "calendarTitleEn");
p([
  u()
], l.prototype, "viewDate");
p([
  u()
], l.prototype, "selectedStart");
p([
  u()
], l.prototype, "selectedEnd");
p([
  u()
], l.prototype, "bookedRanges");
p([
  u()
], l.prototype, "basePricePerDay");
p([
  u()
], l.prototype, "errorMessage");
p([
  u()
], l.prototype, "isPackageMode");
p([
  u()
], l.prototype, "packageOptions");
p([
  u()
], l.prototype, "selectedPackageValue");
typeof l < "u" && l.registerSallaComponent("salla-rental-calendar");
export {
  l as default
};
