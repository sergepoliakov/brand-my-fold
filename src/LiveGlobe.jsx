import { useEffect, useMemo, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { ExternalLink, Globe2, LocateFixed, Radio, Users } from "lucide-react";
import { MAP_STYLE } from "./content.js";

function relativeTime(timestamp, lang) {
  const milliseconds = Math.max(0, Date.now() - new Date(timestamp || Date.now()).getTime());
  const minutes = Math.round(milliseconds / 60000);
  if (lang === "zh") return minutes < 1 ? "刚刚" : minutes < 60 ? `${minutes} 分钟前` : minutes < 1440 ? `${Math.floor(minutes / 60)} 小时前` : `${Math.floor(minutes / 1440)} 天前`;
  return minutes < 1 ? "just now" : minutes < 60 ? `${minutes}m ago` : minutes < 1440 ? `${Math.floor(minutes / 60)}h ago` : `${Math.floor(minutes / 1440)}d ago`;
}

function countryFlag(code) {
  const normalized = String(code || "").toUpperCase();
  if (!/^[A-Z]{2}$/.test(normalized)) return "●";
  return String.fromCodePoint(...normalized.split("").map((letter) => 127397 + letter.charCodeAt(0)));
}

function countryName(code, lang) {
  if (!code) return "";
  try {
    return new Intl.DisplayNames([lang === "zh" ? "zh-CN" : "en"], { type: "region" }).of(code.toUpperCase()) || code;
  } catch {
    return code;
  }
}

function sourceLabel(source, lang, direct) {
  if (source === "Direct") return direct;
  if (lang !== "zh") return source || direct;
  return { Search: "搜索", Referral: "引荐链接", Campaign: "活动链接", "Product Hunt": "Product Hunt" }[source] || source || direct;
}

export function LiveGlobe({ traffic, lang, copy }) {
  const container = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const interactedUntil = useRef(0);
  const visits = useMemo(() => (traffic?.visits || []).map((visit, index) => ({
    ...visit,
    id: `${visit.countryCode || "xx"}-${visit.lastSeen || "now"}-${index}`,
    location: [visit.city, countryName(visit.countryCode, lang)].filter(Boolean).join(", ") || copy.unknown,
    hasCoordinates: Number.isFinite(visit.latitude) && Number.isFinite(visit.longitude),
  })), [traffic?.visits, lang, copy.unknown]);
  const mappedVisits = useMemo(() => visits.filter((visit) => visit.hasCoordinates), [visits]);
  const [selectedId, setSelectedId] = useState("");

  useEffect(() => {
    setSelectedId((current) => visits.some((visit) => visit.id === current) ? current : visits[0]?.id || "");
  }, [visits]);

  useEffect(() => {
    if (!container.current || mapRef.current) return undefined;
    const map = new maplibregl.Map({
      container: container.current,
      style: MAP_STYLE,
      center: [12, 22],
      zoom: 1.1,
      minZoom: 0.7,
      maxZoom: 8,
      attributionControl: true,
      dragRotate: true,
      touchPitch: true,
      pitchWithRotate: true,
    });
    mapRef.current = map;
    const resizeObserver = "ResizeObserver" in window ? new ResizeObserver(() => map.resize()) : null;
    resizeObserver?.observe(container.current);
    const firstResize = window.requestAnimationFrame(() => map.resize());
    map.addControl(new maplibregl.NavigationControl({ showCompass: true, showZoom: true, visualizePitch: true }), "top-right");
    map.addControl(new maplibregl.FullscreenControl(), "top-right");
    map.on("style.load", () => {
      map.setProjection({ type: "globe" });
      map.addSource("live-visitors", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({ id: "visitor-glow", type: "circle", source: "live-visitors", paint: { "circle-radius": 17, "circle-color": "#34c759", "circle-opacity": 0.17, "circle-blur": 0.7 } });
      map.addLayer({ id: "visitor-points", type: "circle", source: "live-visitors", paint: { "circle-radius": 5, "circle-color": "#34c759", "circle-stroke-width": 1.5, "circle-stroke-color": "#fff", "circle-opacity": 0.95 } });
    });
    const markInteraction = () => { interactedUntil.current = Date.now() + 6500; };
    ["mousedown", "touchstart", "wheel", "dragstart", "zoomstart", "pitchstart", "rotatestart"].forEach((event) => map.on(event, markInteraction));
    map.on("mouseenter", "visitor-points", () => { map.getCanvas().style.cursor = "pointer"; });
    map.on("mouseleave", "visitor-points", () => { map.getCanvas().style.cursor = "grab"; });
    map.on("click", "visitor-points", (event) => {
      const id = event.features?.[0]?.properties?.id;
      if (id) setSelectedId(id);
    });
    const spin = window.setInterval(() => {
      if (Date.now() > interactedUntil.current && !map.isMoving() && map.getZoom() < 3.2) map.rotateTo(map.getBearing() + 0.12, { duration: 0 });
    }, 70);
    return () => {
      window.clearInterval(spin);
      window.cancelAnimationFrame(firstResize);
      resizeObserver?.disconnect();
      markersRef.current.forEach((marker) => marker.remove());
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const data = { type: "FeatureCollection", features: mappedVisits.map((visit) => ({ type: "Feature", geometry: { type: "Point", coordinates: [visit.longitude, visit.latitude] }, properties: { id: visit.id, source: visit.source } })) };
    const update = () => map.getSource("live-visitors")?.setData(data);
    if (map.isStyleLoaded()) update(); else map.once("style.load", update);
  }, [mappedVisits]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return undefined;
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = mappedVisits.slice(0, 60).map((visit) => {
      const element = document.createElement("button");
      element.type = "button";
      element.className = "visitor-map-marker";
      element.textContent = countryFlag(visit.countryCode);
      element.setAttribute("aria-label", `${visit.location} · ${visit.source}`);
      element.title = `${visit.location} · ${visit.source}`;
      element.addEventListener("click", (event) => {
        event.stopPropagation();
        setSelectedId(visit.id);
        interactedUntil.current = Date.now() + 8000;
        map.flyTo({ center: [visit.longitude, visit.latitude], zoom: Math.max(3.1, map.getZoom()), duration: 1000, essential: true });
      });
      return new maplibregl.Marker({ element, anchor: "center" }).setLngLat([visit.longitude, visit.latitude]).addTo(map);
    });
    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
    };
  }, [mappedVisits]);

  const selected = visits.find((visit) => visit.id === selectedId) || visits[0];
  const selectVisit = (visit) => {
    setSelectedId(visit.id);
    if (!visit.hasCoordinates) return;
    interactedUntil.current = Date.now() + 8000;
    mapRef.current?.flyTo({ center: [visit.longitude, visit.latitude], zoom: Math.max(3.1, mapRef.current.getZoom()), duration: 1200, essential: true });
  };
  const status = traffic?.updatedAt ? "live" : "loading";

  return <div className="traffic-panel">
    <div ref={container} className="globe-map" aria-label={copy.lead}/>
    <div className="traffic-top"><Users size={15}/><strong>{Number(traffic?.liveVisitors || 0).toLocaleString()} {copy.liveNow}</strong><span>{Number(traffic?.totalVisitors || 0).toLocaleString()} {copy.opens}</span></div>
    <div className={`traffic-source traffic-source-${status}`}><span className="source-pulse"/>{status === "live" ? copy.live : copy.loading}{traffic?.updatedAt && <> · <time>{new Date(traffic.updatedAt).toLocaleTimeString(lang === "zh" ? "zh-CN" : "en", { hour: "2-digit", minute: "2-digit" })}</time></>}</div>
    {selected && <div className="visitor-detail" aria-live="polite"><Radio size={16}/><div><span>{copy.selected}</span><strong>{countryFlag(selected.countryCode)} {selected.location}</strong><small>{sourceLabel(selected.source, lang, copy.direct)} · {relativeTime(selected.lastSeen, lang)}</small></div>{selected.hasCoordinates && <button onClick={() => selectVisit(selected)} aria-label="Locate visitor"><LocateFixed size={15}/></button>}</div>}
    <div className="traffic-feed">{visits.slice(0, 5).map((visit) => <button key={visit.id} className={visit.id === selected?.id ? "active" : ""} aria-pressed={visit.id === selected?.id} onClick={() => selectVisit(visit)}><span className="live-dot"/><strong>{countryFlag(visit.countryCode)}</strong><span>{visit.location}</span><small>{sourceLabel(visit.source, lang, copy.direct)} · {relativeTime(visit.lastSeen, lang)}</small></button>)}{!visits.length && <div className="traffic-empty"><Globe2 size={18}/><span>{copy.loading}</span></div>}</div>
    <div className="traffic-instruction">{copy.instruction}</div>
    <a className="traffic-powered" href="/privacy">{copy.source}<ExternalLink size={11}/></a>
  </div>;
}
