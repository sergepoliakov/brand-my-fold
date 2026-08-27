import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Activity, ExternalLink, Globe2, LocateFixed, RefreshCw } from "lucide-react";
import { MAP_STYLE, USGS_FEED } from "./content.js";

function relativeTime(timestamp, lang) {
  const minutes = Math.max(0, Math.round((Date.now() - timestamp) / 60000));
  if (lang === "zh") return minutes < 1 ? "刚刚" : minutes < 60 ? `${minutes} 分钟前` : `${Math.floor(minutes / 60)} 小时前`;
  return minutes < 1 ? "just now" : minutes < 60 ? `${minutes}m ago` : `${Math.floor(minutes / 60)}h ago`;
}

export function LiveGlobe({ visitors, lang, copy }) {
  const container = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const interactedUntil = useRef(0);
  const [events, setEvents] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [status, setStatus] = useState("loading");
  const [updatedAt, setUpdatedAt] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setStatus("loading");
    fetch(USGS_FEED, { signal: controller.signal, cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error(`USGS ${response.status}`);
        return response.json();
      })
      .then((payload) => {
        const next = (payload.features || []).map((feature) => ({
          id: feature.id,
          mag: Number(feature.properties?.mag || 0),
          place: feature.properties?.place || "Unknown location",
          time: Number(feature.properties?.time || Date.now()),
          url: feature.properties?.url || "https://earthquake.usgs.gov/earthquakes/map/",
          longitude: Number(feature.geometry?.coordinates?.[0]),
          latitude: Number(feature.geometry?.coordinates?.[1]),
          depth: Number(feature.geometry?.coordinates?.[2] || 0),
        })).filter((event) => Number.isFinite(event.latitude) && Number.isFinite(event.longitude)).sort((a, b) => b.mag - a.mag).slice(0, 120);
        setEvents(next);
        setSelectedId((current) => next.some((event) => event.id === current) ? current : next[0]?.id || "");
        setUpdatedAt(Number(payload.metadata?.generated || Date.now()));
        setStatus("live");
      })
      .catch((error) => {
        if (error.name !== "AbortError") setStatus("error");
      });
    return () => controller.abort();
  }, [reloadKey]);

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
    if (resizeObserver) resizeObserver.observe(container.current);
    const firstResize = window.requestAnimationFrame(() => map.resize());
    map.addControl(new maplibregl.NavigationControl({ showCompass: true, showZoom: true, visualizePitch: true }), "top-right");
    map.addControl(new maplibregl.FullscreenControl(), "top-right");
    map.on("style.load", () => {
      map.setProjection({ type: "globe" });
      if (!map.getSource("live-events")) map.addSource("live-events", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      if (!map.getLayer("event-glow")) map.addLayer({ id: "event-glow", type: "circle", source: "live-events", paint: { "circle-radius": ["interpolate", ["linear"], ["get", "mag"], 2.5, 7, 7, 20], "circle-color": "#ff6b35", "circle-opacity": 0.18, "circle-blur": 0.65 } });
      if (!map.getLayer("event-points")) map.addLayer({ id: "event-points", type: "circle", source: "live-events", paint: { "circle-radius": ["interpolate", ["linear"], ["get", "mag"], 2.5, 3.5, 7, 10], "circle-color": "#ff7d42", "circle-stroke-width": 1.5, "circle-stroke-color": "#fff", "circle-opacity": 0.95 } });
    });
    const markInteraction = () => { interactedUntil.current = Date.now() + 6500; };
    ["mousedown", "touchstart", "wheel", "dragstart", "zoomstart", "pitchstart", "rotatestart"].forEach((event) => map.on(event, markInteraction));
    map.on("mouseenter", "event-points", () => { map.getCanvas().style.cursor = "pointer"; });
    map.on("mouseleave", "event-points", () => { map.getCanvas().style.cursor = "grab"; });
    map.on("click", "event-points", (event) => {
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
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const data = { type: "FeatureCollection", features: events.map((event) => ({ type: "Feature", id: event.id, geometry: { type: "Point", coordinates: [event.longitude, event.latitude] }, properties: { id: event.id, mag: event.mag, place: event.place } })) };
    const update = () => map.getSource("live-events")?.setData(data);
    if (map.isStyleLoaded()) update(); else map.once("style.load", update);
  }, [events]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !events.length) return undefined;
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = events.slice(0, 60).map((event) => {
      const element = document.createElement("button");
      element.type = "button";
      element.className = "quake-map-marker";
      element.style.setProperty("--marker-size", `${Math.min(22, 9 + event.mag * 1.7)}px`);
      element.style.zIndex = String(Math.round(event.mag * 100));
      element.setAttribute("aria-label", `M ${event.mag.toFixed(1)} · ${event.place}`);
      element.title = `M ${event.mag.toFixed(1)} · ${event.place}`;
      element.addEventListener("click", (clickEvent) => {
        clickEvent.stopPropagation();
        setSelectedId(event.id);
        interactedUntil.current = Date.now() + 8000;
        map.flyTo({ center: [event.longitude, event.latitude], zoom: Math.max(3.1, map.getZoom()), duration: 1000, essential: true });
      });
      return new maplibregl.Marker({ element, anchor: "center" }).setLngLat([event.longitude, event.latitude]).addTo(map);
    });
    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
    };
  }, [events]);

  const selected = events.find((event) => event.id === selectedId) || events[0];
  const selectEvent = (event) => {
    setSelectedId(event.id);
    interactedUntil.current = Date.now() + 8000;
    mapRef.current?.flyTo({ center: [event.longitude, event.latitude], zoom: Math.max(3.1, mapRef.current.getZoom()), duration: 1200, essential: true });
  };

  return <div className="traffic-panel">
    <div ref={container} className="globe-map" aria-label={copy.lead} />
    <div className="traffic-top"><Globe2 size={15}/><strong>{visitors.toLocaleString()} {copy.opens}</strong><span>{events.length} {copy.events}</span></div>
    <div className={`traffic-source traffic-source-${status}`}>
      {status === "loading" && <><span className="source-pulse"/>{copy.loading}</>}
      {status === "live" && <><span className="source-pulse"/>{copy.live} · <time>{new Date(updatedAt).toLocaleTimeString(lang === "zh" ? "zh-CN" : "en", { hour: "2-digit", minute: "2-digit" })}</time></>}
      {status === "error" && <button onClick={() => setReloadKey((value) => value + 1)}><RefreshCw size={12}/>{copy.retry}</button>}
    </div>
    {selected && <div className="quake-detail" aria-live="polite"><Activity size={16}/><div><span>{copy.selected}</span><strong>M {selected.mag.toFixed(1)} · {selected.place}</strong><small>{selected.depth.toFixed(1)} {copy.depth} · {relativeTime(selected.time, lang)}</small></div><button onClick={() => selectEvent(selected)} aria-label="Locate event"><LocateFixed size={15}/></button><a href={selected.url} target="_blank" rel="noreferrer" aria-label="USGS event"><ExternalLink size={14}/></a></div>}
    <div className="traffic-feed">{events.slice(0, 5).map((event) => <button key={event.id} className={event.id === selected?.id ? "active" : ""} aria-pressed={event.id === selected?.id} onClick={() => selectEvent(event)}><span className="live-dot"/><strong>M {event.mag.toFixed(1)}</strong><span>{event.place}</span><small>{relativeTime(event.time, lang)}</small></button>)}</div>
    <div className="traffic-instruction">{copy.instruction}</div>
    <a className="traffic-powered" href="https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php" target="_blank" rel="noreferrer">{copy.source}<ExternalLink size={11}/></a>
  </div>;
}
