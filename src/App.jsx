import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Copy, ExternalLink, Languages, Plus, ShieldCheck, Upload, X } from "lucide-react";
import { CHANNEL_NAME, COPY, IS_PRODUCTION_EDITION, LANGUAGE_KEY, PRODUCT_IMAGES, PRODUCT_NAME, seedSpots, STORAGE_KEY, TARGET_USDT, VISITOR_KEY, WAITLIST_KEY } from "./content.js";
import { createBidQuote, joinWaitlist, loadAuction, loadRuntimeConfig, recordExperiment, subscribeToAuction, uploadArtwork, verifyBidPayment } from "./api.js";
import { ANONYMOUS_KEY, EXPERIMENT_KEY, anonymousId, ctaCopy, pickVariant } from "./experiment.js";
import { LiveGlobe } from "./LiveGlobe.jsx";

const FALLBACK_END = Date.now() + 14 * 86400000;

function mergeSpots(spots = []) {
  return seedSpots.map((seed) => {
    const current = spots.find((item) => Number(item.id) === seed.id);
    return current ? { ...seed, ...current, positions: seed.positions, coordinate: seed.coordinate, dimensions: seed.dimensions, size: seed.size, name: seed.name, nameZh: seed.nameZh } : seed;
  });
}

function normalizeAuction(payload) {
  const parsedEnd = payload?.endsAt ? new Date(payload.endsAt).getTime() : FALLBACK_END;
  return { status: payload?.status || "preview", spots: mergeSpots(payload?.spots || []), endsAt: Number.isFinite(parsedEnd) ? parsedEnd : FALLBACK_END, updatedAt: payload?.updatedAt || new Date().toISOString() };
}

function readLocalAuction() {
  let saved;
  try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"); } catch { saved = null; }
  const auction = normalizeAuction(saved || { spots: seedSpots, endsAt: FALLBACK_END });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(auction));
  return auction;
}

function formatMoney(amount, lang = "en") {
  return `${new Intl.NumberFormat(lang === "zh" ? "zh-CN" : "en-US", { maximumFractionDigits: 2 }).format(Number(amount || 0))} USDT`;
}

function formatCountdown(endsAt, lang) {
  const diff = Math.max(0, Number(endsAt) - Date.now());
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  return lang === "zh" ? `${days} 天 ${hours} 小时 ${String(minutes).padStart(2, "0")} 分` : `${days}d ${hours}h ${String(minutes).padStart(2, "0")}m`;
}

function BrandMark({ spot, label = false }) {
  if (spot.customLogo) return <img className="brand-upload" src={spot.customLogo} alt={`${spot.brand || "Brand"} artwork`} />;
  if (!spot.brand) return <span className="brand-available">{spot.coordinate}</span>;
  return <span className="brand-lockup" style={{ color: `#${spot.color || "1d1d1f"}` }}><span className="brand-fallback">{spot.brand.slice(0, 2).toUpperCase()}</span>{label && <span>{spot.brand}</span>}</span>;
}

function LanguageToggle({ lang, setLang }) {
  return <div className="language-toggle" role="group" aria-label="Language / 语言"><Languages size={13}/><button aria-pressed={lang === "zh"} onClick={() => setLang("zh")}>中</button><i/><button aria-pressed={lang === "en"} onClick={() => setLang("en")}>EN</button></div>;
}

function Header({ route, onNavigate, lang, setLang, cta, onCta }) {
  const t = COPY[lang];
  const goHash = (event, hash) => {
    event.preventDefault();
    onCta?.();
    if (route !== "/") onNavigate(`/${hash}`); else document.querySelector(hash)?.scrollIntoView({ behavior: "smooth" });
  };
  return <nav className="site-nav"><div className="nav-inner"><a className="brand-home" href="/" onClick={(event) => { event.preventDefault(); onNavigate("/"); }}><span className="brand-glyph">B</span><span>Brand My Fold</span></a><div className="nav-links"><a href="#spots" onClick={(event) => goHash(event, "#spots")}>{t.nav.auction}</a><a href="#how" onClick={(event) => goHash(event, "#how")}>{t.nav.how}</a><a href="#device" onClick={(event) => goHash(event, "#device")}>{t.nav.device}</a><a href="#faq" onClick={(event) => goHash(event, "#faq")}>{t.nav.faq}</a></div><div className="nav-actions"><LanguageToggle lang={lang} setLang={setLang}/><a className="pill pill-blue" href="#spots" onClick={(event) => goHash(event, "#spots")}>{cta}</a></div></div></nav>;
}

function PresentationControl({ value, onChange, lang }) {
  const t = COPY[lang].hero;
  return <div className="presentation-control" aria-label={lang === "zh" ? "设备展示状态" : "Device presentation state"}><button aria-pressed={value.view === "unfolded"} onClick={() => onChange({ ...value, view: "unfolded" })}>{t.unfolded}</button><button aria-pressed={value.view === "folded"} onClick={() => onChange({ ...value, view: "folded" })}>{t.folded}</button><span className="presentation-divider" aria-hidden="true"/><button aria-pressed={value.layer === "auction"} onClick={() => onChange({ ...value, layer: "auction" })}>{t.auctionLayer}</button><button aria-pressed={value.layer === "final"} onClick={() => onChange({ ...value, layer: "final" })}>{t.finalLayer}</button></div>;
}

function DeviceStage({ spots, presentation, onSelect, lang }) {
  const t = COPY[lang];
  return <div className={`device-stage device-stage-${presentation.view} device-stage-${presentation.layer}`}><img className="device-render active" src={PRODUCT_IMAGES[presentation.view]} alt={`${PRODUCT_NAME} · ${presentation.view}`}/><span className="surface-zone-label">{t.hero.printable}</span>{presentation.view === "unfolded" && <span className="screen-zone-label"><i/>{t.hero.screen}</span>}{spots.map((spot) => {
    if (presentation.layer === "final" && !spot.brand) return null;
    const [left, top, width, height] = spot.positions[presentation.view];
    return <button key={spot.id} className="surface-spot" style={{ left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%` }} onClick={() => onSelect(spot)} aria-label={`${spot.coordinate} · ${lang === "zh" ? spot.nameZh : spot.name} · ${formatMoney(spot.amount, lang)}`}>{presentation.layer === "auction" && <span className="spot-id">{spot.id}</span>}<span className="spot-content"><BrandMark spot={spot}/>{presentation.layer === "auction" && <span className="spot-price">{formatMoney(spot.amount, lang)}</span>}</span>{presentation.layer === "auction" && <span className="spot-hover">{spot.bids ? t.hero.outbid : t.hero.bid}</span>}</button>;
  })}</div>;
}

function TurnstileChallenge({ siteKey, onToken }) {
  const host = useRef(null);
  useEffect(() => {
    if (!siteKey || !host.current) return undefined;
    let widget;
    let cancelled = false;
    const render = () => {
      if (cancelled || !window.turnstile || !host.current) return;
      widget = window.turnstile.render(host.current, { sitekey: siteKey, callback: onToken, "expired-callback": () => onToken("") });
    };
    if (window.turnstile) render();
    else {
      const existing = document.querySelector("script[data-brand-my-fold-turnstile]");
      if (existing) existing.addEventListener("load", render, { once: true });
      else {
        const script = document.createElement("script");
        script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
        script.async = true;
        script.defer = true;
        script.dataset.brandMyFoldTurnstile = "true";
        script.addEventListener("load", render, { once: true });
        document.head.appendChild(script);
      }
    }
    return () => { cancelled = true; if (widget && window.turnstile) window.turnstile.remove(widget); };
  }, [siteKey, onToken]);
  if (!siteKey) return null;
  return <div className="turnstile-slot" ref={host}/>;
}

function BidModal({ spot, runtime, onClose, onDemoBid, onVerifiedBid, lang, onQuoteCreated }) {
  const t = COPY[lang];
  const minimum = Number(spot.amount) + (spot.bids > 0 ? 10 : 0);
  const [bid, setBid] = useState(minimum);
  const [brand, setBrand] = useState(spot.brand || "");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState(spot.url || "");
  const [handle, setHandle] = useState("");
  const enabledNetworks = runtime.networks?.filter((item) => item.enabled) || [];
  const [network, setNetwork] = useState(enabledNetworks[0]?.id || "");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(spot.customLogo || "");
  const [quote, setQuote] = useState(null);
  const [txHash, setTxHash] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");
  const paymentsEnabled = runtime.paymentsLive && enabledNetworks.length > 0;

  useEffect(() => { const close = (event) => { if (event.key === "Escape") onClose(); }; window.addEventListener("keydown", close); return () => window.removeEventListener("keydown", close); }, [onClose]);

  const chooseFile = (event) => {
    const next = event.target.files?.[0];
    if (!next) return;
    if (next.size > 1_000_000) { setError(t.modal.fileLarge); return; }
    if (!["image/png", "image/jpeg", "image/webp"].includes(next.type)) { setError(t.modal.fileType); return; }
    setFile(next);
    const reader = new FileReader();
    reader.onload = () => setPreview(String(reader.result));
    reader.readAsDataURL(next);
    setError("");
  };
  const validate = () => {
    if (!brand.trim()) return t.modal.requiredBrand;
    if (!/^\S+@\S+\.\S+$/.test(email)) return t.modal.validEmail;
    if (Number(bid) < minimum) return `${t.modal.minimum} ${formatMoney(minimum, lang)}`;
    if (paymentsEnabled && !network) return t.modal.networkRequired;
    return "";
  };
  const submitDetails = async (event) => {
    event.preventDefault();
    const invalid = validate();
    if (invalid) { setError(invalid); return; }
    if (!paymentsEnabled) { onDemoBid({ ...spot, amount: Number(bid), bids: spot.bids + 1, brand: brand.trim(), email, url: website.trim(), handle: handle.trim(), customLogo: preview, color: "1d1d1f" }); return; }
    setBusy(true); setError("");
    try {
      const nextQuote = await createBidQuote({ spotId: spot.id, amount: Number(bid), brand: brand.trim(), email, website: website.trim(), handle: handle.trim(), network, turnstileToken });
      if (file) await uploadArtwork(nextQuote.id, nextQuote.uploadToken, file);
      setQuote(nextQuote);
      onQuoteCreated?.();
    } catch (requestError) { setError(requestError.payload?.minimum ? `${t.modal.minimum} ${formatMoney(requestError.payload.minimum, lang)}` : requestError.message); } finally { setBusy(false); }
  };
  const verifyPayment = async (event) => {
    event.preventDefault();
    if (!txHash.trim()) { setError(t.modal.transactionHelp); return; }
    setBusy(true); setError("");
    try { const result = await verifyBidPayment(quote.id, txHash.trim()); if (result.auction) onVerifiedBid(normalizeAuction(result.auction), { brand: brand.trim(), spotId: spot.id, amount: Number(bid) }); }
    catch (requestError) { setError(requestError.payload?.refundStatus ? t.modal.pendingRefund : `${t.modal.paymentError} (${requestError.payload?.reason || requestError.message})`); }
    finally { setBusy(false); }
  };
  const copyValue = async (label, value) => { await navigator.clipboard.writeText(value); setCopied(label); window.setTimeout(() => setCopied(""), 1600); };

  return <div className="modal-scrim" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}><section className="bid-modal" role="dialog" aria-modal="true" aria-labelledby="bid-title"><div className="modal-heading"><div><h3 id="bid-title">{spot.coordinate} · {lang === "zh" ? spot.nameZh : spot.name}</h3><p>{spot.dimensions} · {t.modal.shell}</p></div><button className="icon-button" onClick={onClose} aria-label={t.modal.close}><X size={15}/></button></div><div className="current-bid-line"><span>{t.modal.current}</span><strong>{formatMoney(spot.amount, lang)}</strong><span>{spot.brand ? `${t.modal.by} ${spot.brand}` : t.modal.available}</span></div>
    {!quote ? <form onSubmit={submitDetails}><label>{t.modal.bid}<span className="money-input"><span>₮</span><input type="number" min={minimum} step="10" value={bid} onChange={(event) => setBid(event.target.value)} autoFocus/></span></label><p className="field-note">{t.modal.minimum} {formatMoney(minimum, lang)} · {t.modal.settle}</p><div className="deposit-card"><span>{t.modal.deposit}</span><strong>{formatMoney(Math.max(10, Math.ceil(Number(bid || 0) * 20) / 100), lang)}</strong><span>{t.modal.due}</span><strong>{paymentsEnabled ? formatMoney(Math.max(10, Math.ceil(Number(bid || 0) * 20) / 100), lang) : formatMoney(0, lang)}</strong></div>{!paymentsEnabled && <p className="sandbox-note"><ShieldCheck size={14}/>{t.modal.demo}</p>}<div className="form-grid"><label>{t.modal.brand}<input value={brand} onChange={(event) => setBrand(event.target.value)} placeholder="Acme"/></label><label>{t.modal.email}<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@acme.com"/></label><label>{t.modal.website}<input value={website} onChange={(event) => setWebsite(event.target.value)} placeholder="https://acme.com"/></label><label>{t.modal.handle}<input value={handle} onChange={(event) => setHandle(event.target.value)} placeholder="@acme"/></label></div>{paymentsEnabled && <fieldset className="network-field"><legend>{t.modal.network}</legend>{runtime.networks.map((item) => <label key={item.id} className={item.enabled ? "" : "disabled"}><input type="radio" name="network" value={item.id} checked={network === item.id} disabled={!item.enabled} onChange={() => setNetwork(item.id)}/><span><strong>{item.label}</strong><small>{item.standard} · {item.asset}{!item.enabled ? ` · ${lang === "zh" ? "尚未配置收款地址" : "address not configured"}` : ""}</small></span></label>)}</fieldset>}<label className="upload-zone"><input type="file" accept="image/png,image/jpeg,image/webp" onChange={chooseFile}/>{preview ? <img src={preview} alt="Artwork preview"/> : <Upload size={19}/>}<span><strong>{t.modal.upload}</strong><small>{t.modal.uploadTypes}</small></span></label><TurnstileChallenge siteKey={runtime.turnstileSiteKey} onToken={setTurnstileToken}/>{error && <p className="form-error" role="alert">{error}</p>}<button className="submit-bid" type="submit" disabled={busy || Boolean(runtime.turnstileSiteKey && !turnstileToken)}>{busy ? "…" : paymentsEnabled ? t.modal.continue : t.modal.demoAction}</button><p className="review-note">{t.modal.review}</p></form>
      : <form className="payment-step" onSubmit={verifyPayment}><div className="payment-status"><ShieldCheck size={18}/><div><strong>{quote.payment.label}</strong><span>{quote.payment.standard} · {quote.payment.asset}</span></div></div><div className="payment-amount"><span>{t.modal.due}</span><strong>{formatMoney(quote.payment.amount, lang)}</strong></div>{[[t.modal.destination, quote.payment.destination], [t.modal.token, quote.payment.tokenContract]].map(([label, value]) => <div className="copy-field" key={label}><span>{label}</span><code>{value}</code><button type="button" onClick={() => copyValue(label, value)}><Copy size={13}/>{copied === label ? t.modal.copied : t.modal.copy}</button></div>)}<p className="quote-expiry">{t.modal.quoteExpires} <time>{new Date(quote.expiresAt).toLocaleTimeString(lang === "zh" ? "zh-CN" : "en", { hour: "2-digit", minute: "2-digit" })}</time></p><label>{t.modal.transaction}<input value={txHash} onChange={(event) => setTxHash(event.target.value)} placeholder={quote.payment.network === "solana" ? "Base58 signature" : "0x…"}/></label><p className="field-note">{t.modal.transactionHelp}</p>{error && <p className="form-error" role="alert">{error}</p>}<button className="submit-bid" type="submit" disabled={busy}>{busy ? "…" : t.modal.verify}</button></form>}
  </section></div>;
}

function AuctionTable({ spots, onSelect, lang }) {
  const t = COPY[lang];
  return <div className="auction-table-wrap"><table className="auction-table"><thead><tr><th>{t.auction.placement}</th><th>{t.auction.size}</th><th>{t.auction.held}</th><th>{t.auction.bid}</th><th><span className="sr-only">{t.auction.action}</span></th></tr></thead><tbody>{spots.map((spot) => <tr key={spot.id}><td><span className="spot-number">{spot.id}</span><span>{lang === "zh" ? spot.nameZh : spot.name}<small>{spot.coordinate} · {t.auction.shell}</small></span></td><td><span className="size-badge">{spot.size}</span><small>{spot.dimensions}</small></td><td>{spot.brand ? (spot.url ? <a href={spot.url} target="_blank" rel="noreferrer"><BrandMark spot={spot} label/></a> : <BrandMark spot={spot} label/>) : <span className="available-cell">{t.auction.available}</span>}</td><td><strong>{formatMoney(spot.amount, lang)}</strong><small>{spot.bids} {spot.bids === 1 ? t.auction.oneBid : t.auction.bids}</small></td><td><button className="table-bid" onClick={() => onSelect(spot)}>{t.auction.action}</button></td></tr>)}</tbody></table></div>;
}

function WaitlistForm({ lang, runtime, standalone = false }) {
  const t = COPY[lang].waitlist;
  const [email, setEmail] = useState(""); const [handle, setHandle] = useState(""); const [done, setDone] = useState(false); const [error, setError] = useState(""); const [turnstileToken, setTurnstileToken] = useState("");
  const submit = async (event) => {
    event.preventDefault(); setError("");
    if (runtime.offline) { let existing = []; try { existing = JSON.parse(localStorage.getItem(WAITLIST_KEY) || "[]"); } catch { existing = []; } localStorage.setItem(WAITLIST_KEY, JSON.stringify([...existing, { email, handle, createdAt: Date.now() }])); setDone(true); return; }
    try { await joinWaitlist({ email, handle, turnstileToken }); setDone(true); } catch { setError(t.error); }
  };
  if (done) return <div className="waitlist-success"><Check size={20}/><div><strong>{t.done}</strong><span>{runtime.offline ? t.doneDemo : t.doneSub}</span></div></div>;
  return <form className={`waitlist-form ${standalone ? "standalone" : ""}`} onSubmit={submit}><input aria-label={t.email} type="email" placeholder={t.email} value={email} onChange={(event) => setEmail(event.target.value)} required/><input aria-label={t.handle} placeholder={t.handle} value={handle} onChange={(event) => setHandle(event.target.value)}/><button disabled={Boolean(runtime.turnstileSiteKey && !turnstileToken)}>{t.button}</button><TurnstileChallenge siteKey={runtime.turnstileSiteKey} onToken={setTurnstileToken}/><p>{runtime.offline ? t.localDemo : t.local}{error && ` · ${error}`}</p></form>;
}

function Footer({ onNavigate, lang }) {
  const t = COPY[lang].footer;
  return <footer className="site-footer"><div className="footer-inner"><div className="founder-card"><div className="founder-avatar">S</div><div><p><strong>{t.hi}</strong></p><p>{t.bio}</p></div></div><p>{t.prompt} <a href="/waitlist" onClick={(event) => { event.preventDefault(); onNavigate("/waitlist"); }}>{t.join}</a></p><nav><a href="/privacy" onClick={(event) => { event.preventDefault(); onNavigate("/privacy"); }}>{t.privacy}</a><a href="/terms" onClick={(event) => { event.preventDefault(); onNavigate("/terms"); }}>{t.terms}</a><a href="https://github.com/sergepoliakov/brand-my-fold" target="_blank" rel="noreferrer">{t.source}<ExternalLink size={10}/></a></nav><p className="legal-small">{t.legal}</p></div></footer>;
}

function HomePage({ auction, setAuction, runtime, visitors, onNavigate, lang, setLang, variant, recordEvent }) {
  const t = COPY[lang];
  const [presentation, setPresentation] = useState({ view: "unfolded", layer: "auction" }); const [selected, setSelected] = useState(null); const [toast, setToast] = useState(""); const [, setNow] = useState(Date.now());
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 30000); return () => window.clearInterval(timer); }, []);
  const total = auction.spots.filter((spot) => spot.bids > 0).reduce((sum, spot) => sum + Number(spot.amount || 0), 0); const progress = Math.round(total / TARGET_USDT * 100);
  const chooseSpot = (spot) => { setSelected(spot); recordEvent("bid_open"); };
  const demoBid = (nextSpot) => { const next = { ...auction, spots: auction.spots.map((spot) => spot.id === nextSpot.id ? nextSpot : spot), updatedAt: new Date().toISOString() }; localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); setAuction(next); if ("BroadcastChannel" in window) { const channel = new BroadcastChannel(CHANNEL_NAME); channel.postMessage({ type: "auction", payload: next }); channel.close(); } setSelected(null); setToast(`${nextSpot.brand} · ${t.modal.demoSuccess}`); window.setTimeout(() => setToast(""), 4200); };
  const verifiedBid = (nextAuction, result) => { setAuction(nextAuction); setSelected(null); setToast(`${result.brand} ${t.modal.success} ${result.spotId} · ${formatMoney(result.amount, lang)}`); window.setTimeout(() => setToast(""), 4200); };
  const cta = ctaCopy(lang, variant);
  return <><Header route="/" onNavigate={onNavigate} lang={lang} setLang={setLang} cta={cta} onCta={() => recordEvent("cta")}/><main><header className="hero-shell"><div className="hero-copy"><p className="visitor-count"><strong>{visitors.toLocaleString()}</strong> {t.hero.visitors}</p><h1>{t.hero.title}</h1><p className="hero-subtitle">{t.hero.subtitle}</p><div className="funding-block"><div><strong>{formatMoney(total, lang)}</strong><span>{t.hero.raised}</span><span><b>{progress}%</b> {t.hero.goal}</span></div><div className="progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.min(progress, 100)}><i style={{ width: `${Math.min(progress, 100)}%` }}/></div><p>{t.hero.ends} {formatCountdown(auction.endsAt, lang)}</p></div></div><DeviceStage spots={auction.spots} presentation={presentation} onSelect={chooseSpot} lang={lang}/><PresentationControl value={presentation} onChange={setPresentation} lang={lang}/><p className="tap-hint">{t.hero.hint}</p><div className="hero-story"><p>{t.hero.story}</p><p>{t.hero.story2}</p><div><a className="pill pill-dark" href="#spots" onClick={() => recordEvent("cta")}>{cta}</a><a className="text-link" href="#how">{t.hero.howLink} <span>›</span></a></div></div></header><section className="recognition-section"><div className="section-inner recognition-inner"><h2>{t.recognition.title}</h2><a href="#spots">{t.recognition.link}<ArrowRight size={17}/></a><p>{t.recognition.status} · {formatCountdown(auction.endsAt, lang)}</p></div></section><section id="spots" className="surface-section"><div className="section-inner"><p className="eyebrow">{t.auction.eyebrow}</p><h2>{t.auction.title}</h2><p className="section-lead">{t.auction.lead}</p><p className="pricing-line">{t.auction.note}</p><AuctionTable spots={auction.spots} onSelect={chooseSpot} lang={lang}/></div></section><section id="how" className="plain-section"><div className="section-inner narrow-inner"><p className="eyebrow">{t.flow.eyebrow}</p><h2>{t.flow.title}</h2><ol className="steps">{t.flow.steps.map(([title, body], index) => <li key={title}><span>{index + 1}</span><div><h3>{title}</h3><p>{body}</p></div></li>)}</ol></div></section><section id="device" className="surface-section"><div className="section-inner specs-inner"><p className="eyebrow">{t.purchase.eyebrow}</p><h2>{t.purchase.title}</h2><p className="section-lead">{t.purchase.lead}</p><div className="purchase-card"><div className="purchase-visual"><img src={PRODUCT_IMAGES.folded} alt={PRODUCT_NAME}/></div><div className="purchase-copy"><div className="purchase-title"><div><h3>{t.purchase.name}</h3><p>{t.purchase.sub}</p></div><strong>{formatMoney(TARGET_USDT, lang)}</strong></div><dl>{t.purchase.rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><p>{t.purchase.note}</p></div></div></div></section><section id="faq" className="surface-section faq-section"><div className="section-inner narrow-inner"><p className="eyebrow">{t.faq.eyebrow}</p><h2>{t.faq.title}</h2><div className="faq-list">{t.faq.items.map(([question, answer]) => <details key={question}><summary>{question}<Plus size={17}/></summary><p>{answer}</p></details>)}</div></div></section><section id="waitlist" className="waitlist-section"><div className="section-inner waitlist-inner"><p className="eyebrow">{t.waitlist.eyebrow}</p><h2>{t.waitlist.title}</h2><p>{t.waitlist.text}</p><WaitlistForm lang={lang} runtime={runtime}/></div></section><section id="traffic" className="traffic-section"><div className="section-inner"><p className="eyebrow">{t.globe.eyebrow}</p><h2>{t.globe.title}</h2><p className="section-lead">{t.globe.lead}</p><LiveGlobe visitors={visitors} lang={lang} copy={t.globe}/></div></section></main><Footer onNavigate={onNavigate} lang={lang}/>{selected && <BidModal spot={selected} runtime={runtime} onClose={() => setSelected(null)} onDemoBid={demoBid} onVerifiedBid={verifiedBid} lang={lang} onQuoteCreated={() => recordEvent("quote_created")}/>} {toast && <div className="toast" role="status"><Check size={16}/>{toast}</div>}</>;
}

function WaitlistPage({ onNavigate, lang, setLang, runtime, cta }) {
  const t = COPY[lang].waitlist;
  return <><Header route="/waitlist" onNavigate={onNavigate} lang={lang} setLang={setLang} cta={cta}/><main className="secondary-page waitlist-page"><a className="back-link" href="/" onClick={(event) => { event.preventDefault(); onNavigate("/"); }}><ArrowLeft size={15}/>Brand My Fold</a><div className="secondary-content"><p className="eyebrow">{t.eyebrow}</p><h1>{t.title}</h1><p>{t.text}</p><WaitlistForm lang={lang} runtime={runtime} standalone/></div></main></>;
}

function LegalPage({ type, onNavigate, lang, setLang, cta }) {
  const t = COPY[lang].legal; const privacy = type === "privacy"; const sections = privacy ? t.privacySections : t.termsSections;
  return <><Header route={`/${type}`} onNavigate={onNavigate} lang={lang} setLang={setLang} cta={cta}/><main className="legal-page"><div className="legal-inner"><a className="back-link" href="/" onClick={(event) => { event.preventDefault(); onNavigate("/"); }}><ArrowLeft size={15}/>{t.back}</a><p className="eyebrow">BRAND MY FOLD</p><h1>{privacy ? t.privacyTitle : t.termsTitle}</h1><p className="updated">{t.updated}</p><div className="legal-summary">{privacy ? t.privacySummary : t.termsSummary}</div>{sections.map(([title, body]) => <section key={title}><h2>{title}</h2><p>{body}</p></section>)}</div></main></>;
}

export function App() {
  const [auction, setAuction] = useState(readLocalAuction); const [runtime, setRuntime] = useState({ edition: IS_PRODUCTION_EDITION ? "production" : "open-source", paymentsLive: false, networks: [], auctionCurrency: "USDT", offline: true }); const [lang, setLang] = useState(() => localStorage.getItem(LANGUAGE_KEY) || "zh"); const [route, setRoute] = useState(window.location.pathname);
  const [visitors] = useState(() => { const current = Number(localStorage.getItem(VISITOR_KEY) || 0) + 1; localStorage.setItem(VISITOR_KEY, String(current)); return current; });
  const [variant] = useState(() => { const value = pickVariant(window.location.search, localStorage.getItem(EXPERIMENT_KEY) || ""); localStorage.setItem(EXPERIMENT_KEY, value); return value; });
  const [anonymous] = useState(() => { const value = anonymousId(localStorage.getItem(ANONYMOUS_KEY) || ""); localStorage.setItem(ANONYMOUS_KEY, value); return value; });
  const navigate = (path) => { const [pathname, hash] = path.split("#"); window.history.pushState({}, "", path); setRoute(pathname || "/"); window.requestAnimationFrame(() => hash ? document.getElementById(hash)?.scrollIntoView({ behavior: "smooth" }) : window.scrollTo({ top: 0, behavior: "smooth" })); };
  const recordEvent = (event) => { recordExperiment(variant, event, anonymous); };
  useEffect(() => { let active = true; loadRuntimeConfig().then(async (config) => { if (!active) return; setRuntime(config); if (!config.offline) { try { const remoteAuction = await loadAuction(); if (active) setAuction(normalizeAuction(remoteAuction)); } catch { /* Keep the local no-payment demo available. */ } } }); return () => { active = false; }; }, []);
  useEffect(() => { if (runtime.offline) return undefined; return subscribeToAuction((payload) => setAuction(normalizeAuction(payload))); }, [runtime.offline]);
  useEffect(() => { localStorage.setItem(LANGUAGE_KEY, lang); document.documentElement.lang = lang === "zh" ? "zh-CN" : "en"; document.title = lang === "zh" ? "Brand My Fold · 十个实体广告位" : "Brand My Fold · Ten physical placements"; }, [lang]);
  useEffect(() => { const pop = () => setRoute(window.location.pathname); window.addEventListener("popstate", pop); return () => window.removeEventListener("popstate", pop); }, []);
  useEffect(() => { if (!("BroadcastChannel" in window) || !runtime.offline) return undefined; const channel = new BroadcastChannel(CHANNEL_NAME); channel.onmessage = (event) => { if (event.data?.type === "auction") setAuction(normalizeAuction(event.data.payload)); }; return () => channel.close(); }, [runtime.offline]);
  useEffect(() => { recordEvent("view"); }, []);
  const cta = ctaCopy(lang, variant);
  const page = useMemo(() => route === "/waitlist" ? <WaitlistPage onNavigate={navigate} lang={lang} setLang={setLang} runtime={runtime} cta={cta}/> : route === "/privacy" || route === "/terms" ? <LegalPage type={route.slice(1)} onNavigate={navigate} lang={lang} setLang={setLang} cta={cta}/> : <HomePage auction={auction} setAuction={setAuction} runtime={runtime} visitors={visitors} onNavigate={navigate} lang={lang} setLang={setLang} variant={variant} recordEvent={recordEvent}/>, [route, auction, runtime, visitors, lang, variant, anonymous]);
  return <div className="app-shell">{page}</div>;
}
