(() => {
  const measurementId = "G-7GHS4H52VM";
  const storageKey = "ninjalens-analytics-consent";
  let analyticsEnabled = false;
  let analyticsLoaded = false;

  function storedChoice() {
    try { return window.localStorage.getItem(storageKey); }
    catch { return null; }
  }

  function loadAnalytics() {
    if (analyticsLoaded || !analyticsEnabled) return;
    analyticsLoaded = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function gtag() { window.dataLayer.push(arguments); };
    window.gtag("consent", "default", {
      analytics_storage: "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied"
    });
    window.gtag("consent", "update", { analytics_storage: "granted" });
    window.gtag("js", new Date());
    window.gtag("config", measurementId, { anonymize_ip: true });
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    document.head.appendChild(script);
  }

  function setChoice(choice) {
    try { window.localStorage.setItem(storageKey, choice); }
    catch { /* Analytics stays disabled if the browser cannot store the choice. */ }
    analyticsEnabled = choice === "accepted";
    const banner = document.querySelector("#privacy-consent");
    if (banner) banner.hidden = true;
    if (analyticsEnabled) {
      window["ga-disable-" + measurementId] = false;
      loadAnalytics();
    } else {
      window["ga-disable-" + measurementId] = true;
      if (analyticsLoaded && window.gtag) {
        window.gtag("consent", "update", { analytics_storage: "denied" });
      }
    }
  }

  function showBanner() {
    let banner = document.querySelector("#privacy-consent");
    if (!banner) {
      banner = document.createElement("aside");
      banner.id = "privacy-consent";
      banner.className = "privacy-consent";
      banner.setAttribute("aria-label", "Privacy choices");
      banner.innerHTML = '<div class="privacy-consent-copy"><strong>Privacy choices</strong><p>We use Google Analytics to understand how this site is used. Optional analytics stays off unless you allow it. Read our <a href="/privacy.html">Privacy Policy</a>.</p></div><div class="privacy-consent-actions"><button type="button" data-consent-choice="rejected" class="consent-reject">Reject analytics</button><button type="button" data-consent-choice="accepted" class="consent-accept">Accept analytics</button></div>';
      document.body.appendChild(banner);
      banner.addEventListener("click", event => {
        const button = event.target.closest("[data-consent-choice]");
        if (button) setChoice(button.dataset.consentChoice);
      });
    }
    banner.hidden = false;
    banner.querySelector("button")?.focus({ preventScroll: true });
  }

  function openSettings() { showBanner(); }

  window.NinjalensAnalytics = {
    shopify: {
      csvFileLoaded(fileRole) {
        if (analyticsEnabled) window.gtag("event", "shopify_csv_file_loaded", { file_role: fileRole });
      },
      csvSampleLoaded() {
        if (analyticsEnabled) window.gtag("event", "shopify_csv_sample_load");
      },
      csvCompareClick(inputType) {
        if (analyticsEnabled) window.gtag("event", "shopify_csv_compare_click", { input_type: inputType });
      },
      csvAuditClick(inputType) {
        if (analyticsEnabled) window.gtag("event", "shopify_csv_structure_check_click", { input_type: inputType });
      },
      csvAuditResult(inputType) {
        if (analyticsEnabled) window.gtag("event", "shopify_csv_structure_check_result", { input_type: inputType });
      },
      csvCheckerResult(inputType) {
        if (analyticsEnabled) window.gtag("event", "shopify_csv_check_result", { input_type: inputType });
      },
      csvCheckerError(errorType) {
        if (analyticsEnabled) window.gtag("event", "shopify_csv_check_error", { error_type: errorType });
      },
      altLoaded() { if (analyticsEnabled) window.gtag("event", "shopify_alt_csv_loaded"); },
      altDownload() { if (analyticsEnabled) window.gtag("event", "shopify_alt_csv_download"); },
      inventoryReconcile(hasMatches) { if (analyticsEnabled) window.gtag("event", "shopify_inventory_reconcile", { has_matches: hasMatches }); },
      inventoryDownload() { if (analyticsEnabled) window.gtag("event", "shopify_inventory_csv_download"); },
      seoAudit() { if (analyticsEnabled) window.gtag("event", "shopify_seo_audit"); },
      salesSnapshot() { if (analyticsEnabled) window.gtag("event", "seller_sales_snapshot"); },
      customizationSheet() { if (analyticsEnabled) window.gtag("event", "seller_customization_sheet"); },
      inventoryDiff() { if (analyticsEnabled) window.gtag("event", "seller_inventory_compare"); },
      labelSheetPrinted() { if (analyticsEnabled) window.gtag("event", "shipping_label_sheet_print"); }
    },
    etsy: {
      orderProfit() { if (analyticsEnabled) window.gtag("event", "etsy_order_profit_calculate"); }
    },
    openPrivacySettings: openSettings
  };

  document.addEventListener("click", event => {
    if (event.target.closest("[data-open-privacy-settings]")) openSettings();
  });

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("#year").forEach(year => { year.textContent = new Date().getFullYear(); });
    const choice = storedChoice();
    analyticsEnabled = choice === "accepted";
    if (analyticsEnabled) loadAnalytics();
    else if (!choice) showBanner();
  });
})();
