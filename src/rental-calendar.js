document.addEventListener('DOMContentLoaded', () => {
    const rootEl = document.getElementById('rental-calendar-root');
    if (!rootEl) return;

    // Translations Dictionary
    const trans = {
        ar: {
            select_rental_period: "اختر فترة الإيجار",
            duration: "مدة الإيجار",
            days: "أيام",
            select_range_hint: "اختر تاريخ البدء",
            day_selected: "تم تحديد اليوم",
            range_selected: "تم تحديد الفترة",
            select_package: "اختر الباقة",
            unavailable: "المنتج غير متاح في هذه التواريخ",
            select_dates_first: "يرجى اختيار تاريخ البدء والنهاية أولاً",
            booked_overlap: "الفترة المختارة تحتوي على أيام محجوزة"
        },
        en: {
            select_rental_period: "Select rental period",
            duration: "Duration",
            days: "days",
            select_range_hint: "Select start date",
            day_selected: "Day selected",
            range_selected: "Range selected",
            select_package: "Select Package",
            unavailable: "Product unavailable on these dates",
            select_dates_first: "Please select start and end dates first",
            booked_overlap: "Selected range overlaps with booked dates"
        }
    };

    // State Variables
    const state = {
        productId: rootEl.getAttribute('data-product-id'),
        locale: rootEl.getAttribute('data-locale') || 'ar',
        viewDate: new Date(),
        selectedStart: null,
        selectedEnd: null,
        bookedRanges: [],
        basePricePerDay: 0,
        isPackageMode: false,
        packageOptions: [],
        selectedPackageValue: ""
    };
    
    state.viewDate.setDate(1);

    // DOM Elements
    const els = {
        title: document.getElementById('rc-title'),
        packagesView: document.getElementById('rc-packages-view'),
        packagesGrid: document.getElementById('rc-packages-grid'),
        calendarView: document.getElementById('rc-calendar-view'),
        currentMonth: document.getElementById('rc-current-month'),
        prevBtn: document.getElementById('rc-prev-month'),
        nextBtn: document.getElementById('rc-next-month'),
        calendarGrid: document.getElementById('rc-calendar-grid'),
        errorMsg: document.getElementById('rc-error-msg'),
        footer: document.getElementById('rc-footer'),
        daysCount: document.getElementById('rc-days-count'),
        durationLabel: document.getElementById('rc-duration-label'),
        daysLabel: document.getElementById('rc-days-label'),
        hintInfo: document.getElementById('rc-hint-info')
    };

    // Helper functions
    const t = (key) => trans[state.locale][key] || trans['ar'][key];
    const isRtl = state.locale === 'ar';
    const leftArrow = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 19l-7-7 7-7" /></svg>`;
    const rightArrow = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 5l7 7-7 7" /></svg>`;

    // Initialize arrows based on RTL/LTR
    els.prevBtn.innerHTML = isRtl ? rightArrow : leftArrow;
    els.nextBtn.innerHTML = isRtl ? leftArrow : rightArrow;

    // Salla Setup (Price & Hidden Inputs)
    function initSallaOptions() {
        const labels = Array.from(document.querySelectorAll("label"));
        const optionsToHide = ["تاريخ البدء", "تاريخ الانتهاء", "مدة الإيجار", "الباقات"];
        let packagesContainer = null;

        optionsToHide.forEach((text) => {
            const label = labels.find((l) => l.textContent?.trim().includes(text));
            if (label) {
                const container = label.closest(".salla-product-options__item") || label.parentElement;
                if (container) container.style.display = "none";
                if (text === "الباقات") packagesContainer = container;
            }
        });

        if (packagesContainer) {
            state.isPackageMode = true;
            const radios = Array.from(packagesContainer.querySelectorAll('input[type="radio"]'));
            
            if (radios.length > 0) {
                radios.forEach((radio) => {
                    const labelEl = packagesContainer.querySelector(`label[for="${radio.id}"]`) || radio.closest("label");
                    let name = labelEl ? labelEl.textContent.trim() : radio.value;
                    state.packageOptions.push({ value: radio.value, name: name.split("(")[0].trim(), el: radio, type: "radio" });
                });
            } else {
                const select = packagesContainer.querySelector("select");
                if (select) {
                    Array.from(select.options).forEach((opt) => {
                        if (opt.value) {
                            state.packageOptions.push({ value: opt.value, name: opt.text.trim().split("(")[0].trim(), el: opt, type: "select", parentSelect: select });
                        }
                    });
                }
            }
        }
        
        renderBaseUI();
    }

    // Render Base View (Switches between Calendar or Packages)
    function renderBaseUI() {
        if (state.isPackageMode) {
            els.title.innerText = t('select_package');
            els.packagesView.style.display = 'block';
            els.calendarView.style.display = 'none';
            els.footer.style.display = 'none';
            renderPackages();
        } else {
            els.title.innerText = t('select_rental_period');
            els.packagesView.style.display = 'none';
            els.calendarView.style.display = 'block';
            els.footer.style.display = 'flex';
            renderCalendar();
        }
    }

    // Packages Logic
    function renderPackages() {
        els.packagesGrid.innerHTML = state.packageOptions.map((opt, index) => `
            <div class="package-card ${state.selectedPackageValue === opt.value ? "selected" : ""}" data-index="${index}">
                <span class="package-title">${opt.name}</span>
            </div>
        `).join('');
    }

    els.packagesGrid.addEventListener('click', (e) => {
        const card = e.target.closest('.package-card');
        if (!card) return;
        
        const opt = state.packageOptions[card.dataset.index];
        state.selectedPackageValue = opt.value;
        
        if (opt.type === "radio") {
            opt.el.checked = true;
            opt.el.dispatchEvent(new Event("change", { bubbles: true }));
        } else if (opt.type === "select") {
            opt.parentSelect.value = opt.value;
            opt.parentSelect.dispatchEvent(new Event("change", { bubbles: true }));
        }
        
        renderPackages();
        hideError();
    });

    // Calendar Grid Logic
    function renderCalendar() {
        const year = state.viewDate.getFullYear();
        const month = state.viewDate.getMonth();
        
        // Month Label
        let monthFormatter;
        try { monthFormatter = new Intl.DateTimeFormat(state.locale, { month: "long", year: "numeric" }); } 
        catch (e) { monthFormatter = new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }); }
        els.currentMonth.innerText = monthFormatter.format(state.viewDate);

        // Grid HTML
        let html = '';
        
        // Headers
        const weekStartsOn = state.locale === "ar" ? 6 : 0;
        let dayFormatter;
        try { dayFormatter = new Intl.DateTimeFormat(state.locale, { weekday: "narrow" }); } 
        catch (e) { dayFormatter = new Intl.DateTimeFormat("en", { weekday: "narrow" }); }
        
        const tempDate = new Date(2024, 0, 7 + weekStartsOn);
        for (let i = 0; i < 7; i++) {
            const d = new Date(tempDate);
            d.setDate(tempDate.getDate() + i);
            html += `<div class="weekday">${dayFormatter.format(d)}</div>`;
        }

        // Days
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const firstDay = (firstDayOfMonth - weekStartsOn + 7) % 7;
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const prevMonthDays = new Date(year, month, 0).getDate();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Prev month filler
        for (let i = firstDay - 1; i >= 0; i--) {
            html += `<div class="day outside">${prevMonthDays - i}</div>`;
        }

        // Current month days
        for (let i = 1; i <= daysInMonth; i++) {
            const date = new Date(year, month, i);
            const isBooked = state.bookedRanges.some(r => {
                const s = new Date(r.from); const e = new Date(r.to);
                s.setHours(0,0,0,0); e.setHours(0,0,0,0);
                return date >= s && date <= e;
            });

            const isDisabled = date < today || isBooked;
            const isToday = date.getTime() === today.getTime();
            const isSelected = (state.selectedStart && date.getTime() === state.selectedStart.getTime()) ||
                               (state.selectedEnd && date.getTime() === state.selectedEnd.getTime());
            const isInRange = state.selectedStart && state.selectedEnd && date > state.selectedStart && date < state.selectedEnd;

            let classes = ['day'];
            if (isToday) classes.push('today');
            if (isDisabled) classes.push('disabled');
            if (isBooked) classes.push('booked');
            if (isSelected) classes.push('selected');
            if (isInRange) classes.push('in-range');

            html += `<div class="${classes.join(' ')}" data-date="${date.toISOString()}">${i}</div>`;
        }

        // Next month filler
        const totalCellsSoFar = firstDay + daysInMonth;
        for (let i = 1; i <= (42 - totalCellsSoFar); i++) {
            html += `<div class="day outside">${i}</div>`;
        }

        els.calendarGrid.innerHTML = html;
        updateFooter();
    }

    // Calendar Interactions
    els.prevBtn.addEventListener('click', () => {
        state.viewDate.setMonth(state.viewDate.getMonth() - 1);
        renderCalendar();
    });

    els.nextBtn.addEventListener('click', () => {
        state.viewDate.setMonth(state.viewDate.getMonth() + 1);
        renderCalendar();
    });

    els.calendarGrid.addEventListener('click', (e) => {
        const dayEl = e.target.closest('.day:not(.disabled):not(.outside)');
        if (!dayEl) return;

        const date = new Date(dayEl.dataset.date);
        hideError();

        if (!state.selectedStart || (state.selectedStart && state.selectedEnd && state.selectedStart.getTime() !== state.selectedEnd.getTime())) {
            state.selectedStart = date;
            state.selectedEnd = date;
        } else {
            if (date.getTime() === state.selectedStart.getTime()) {
                state.selectedStart = null;
                state.selectedEnd = null;
            } else if (date < state.selectedStart) {
                state.selectedStart = date;
                state.selectedEnd = date;
            } else {
                const hasOverlap = state.bookedRanges.some((range) => {
                    const s = new Date(range.from); const e = new Date(range.to);
                    s.setHours(0,0,0,0); e.setHours(0,0,0,0);
                    return state.selectedStart <= e && date >= s;
                });

                if (hasOverlap) {
                    showError(t("booked_overlap"));
                    state.selectedStart = null;
                    state.selectedEnd = null;
                    renderCalendar();
                    return;
                }
                state.selectedEnd = date;
            }
        }

        renderCalendar();
        updateSallaInputs();
        if (state.selectedStart && state.selectedEnd) checkAvailability();
    });

    function updateFooter() {
        let days = 0;
        if (state.selectedStart && state.selectedEnd) {
            const diffTime = Math.abs(state.selectedEnd.getTime() - state.selectedStart.getTime());
            days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        }
        
        els.durationLabel.innerText = t("duration");
        els.daysLabel.innerText = t("days");
        els.daysCount.innerText = days;

        const rangeHint = (state.selectedStart && state.selectedEnd)
            ? (state.selectedStart.getTime() === state.selectedEnd.getTime() ? t("day_selected") : t("range_selected"))
            : t("select_range_hint");
        els.hintInfo.innerText = rangeHint;
    }

    function showError(msg) {
        els.errorMsg.innerText = msg;
        els.errorMsg.classList.remove('hidden');
    }
    function hideError() {
        els.errorMsg.classList.add('hidden');
    }

    // Data Sync Methods
    function updateSallaInputs() {
        const startStr = state.selectedStart ? state.selectedStart.toISOString().split("T")[0] : "";
        const endStr = state.selectedEnd ? state.selectedEnd.toISOString().split("T")[0] : "";
        setSallaDate("تاريخ البدء", startStr);
        setSallaDate("تاريخ الانتهاء", endStr);
    }

    function setSallaDate(labelText, value) {
        if (!value) return;
        const labels = Array.from(document.querySelectorAll("label"));
        const label = labels.find((l) => l.textContent?.trim().includes(labelText));
        if (label) {
            const container = label.closest(".salla-product-options__item") || label.parentElement;
            const input = container?.querySelector('input[type="date"], input[type="text"]');
            if (input) {
                input.value = value;
                input.dispatchEvent(new Event("change", { bubbles: true }));
            }
        }
    }

    async function fetchBookedDates() {
        if (!state.productId) return;
        try {
            const response = await fetch(`https://medo-store-estajer-backend.hf.space/api/booked-dates?productId=${state.productId}`);
            const data = await response.json();
            state.bookedRanges = data.bookedDates || [];
            renderCalendar(); // Re-render to show blocked days
        } catch (error) { console.error("Failed to fetch booked dates"); }
    }

    async function checkAvailability() {
        if (!state.selectedStart || !state.selectedEnd) return;
        const submitBtn = document.querySelector('salla-add-product-button button[type="submit"]');
        if (submitBtn) submitBtn.setAttribute("disabled", "true");

        const start = state.selectedStart.toISOString().split("T")[0];
        const end = state.selectedEnd.toISOString().split("T")[0];

        try {
            const response = await fetch(`https://medo-store-estajer-backend.hf.space/api/check-availability?productId=${state.productId}&startDate=${start}&endDate=${end}`);
            const data = await response.json();
            if (data.available) {
                if (submitBtn) submitBtn.removeAttribute("disabled");
                hideError();
            } else {
                showError(data.message || t("unavailable"));
            }
        } catch (error) {
            if (submitBtn) submitBtn.removeAttribute("disabled");
        }
    }

    // Intercept Salla Form Submit
    document.addEventListener("click", (e) => {
        const btn = e.target.closest('salla-add-product-button button[type="submit"], button[type="submit"]');
        if (btn && btn.closest(".product-form") && !state.isPackageMode) {
            if (!state.selectedStart || !state.selectedEnd) {
                e.preventDefault(); e.stopPropagation();
                showError(t("select_dates_first"));
            }
        }
    }, true);

    // Boot
    setTimeout(() => {
        initSallaOptions();
        fetchBookedDates();
    }, 1000);
});