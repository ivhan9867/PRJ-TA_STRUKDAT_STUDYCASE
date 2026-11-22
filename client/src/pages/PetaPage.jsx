import { useEffect, useMemo, useRef, useState } from 'react';
import { MapCanvas } from '../map/MapCanvas.jsx';
import { PetaLeftCard } from './PetaLeftCard.jsx';
import { PetaOverlays } from './PetaOverlays.jsx';
import { PatientDetailPanel } from './PatientDetailPanel.jsx';
import { ToastStack } from '../design/index.js';

const CITY_FOCUS = {
  surya: { x: 400, y: 440, zoom: 1.32 },
  tirta: { x: 1180, y: 440, zoom: 1.32 },
};

/**
 * Halaman Peta (halaman utama semua peran).
 * Terhubung langsung ke mesin simulasi server lewat Socket.IO.
 */
export function PetaPage({ user, searchQuery, sim, onNavigate }) {
  const mapRef = useRef(null);
  const statusTimerRef = useRef(null);

  const {
    connected,
    world,
    hospitalDetails,
    selectedPatientDetail,
    toasts,
    dismissToast,
    walkinsRef,
    ambulancesRef,
    sendControl,
    setBridge,
    setAutoReferral,
    triggerScenario,
    undoLastAction,
    resetSimulation,
    requestHospitalDetail,
    requestPatientDetail,
    clearPatientDetail,
  } = sim;

  const [cityFilter, setCityFilter] = useState('all');
  const [selectedHospitalId, setSelectedHospitalId] = useState(null);
  const [statusHighlight, setStatusHighlight] = useState(null);

  useEffect(() => {
    return () => window.clearTimeout(statusTimerRef.current);
  }, []);

  // Saat detail RS dibuka, minta pembaruan antrean & kejadian secara berkala tiap 1 detik
  useEffect(() => {
    if (!selectedHospitalId || !connected) return;
    requestHospitalDetail(selectedHospitalId);
    const id = window.setInterval(() => {
      requestHospitalDetail(selectedHospitalId);
    }, 1000);
    return () => window.clearInterval(id);
  }, [selectedHospitalId, connected, requestHospitalDetail]);

  const selectedHospital = useMemo(
    () => world.hospitals.find((h) => h.id === selectedHospitalId) || null,
    [world.hospitals, selectedHospitalId]
  );

  const selectedHospitalDetail = selectedHospitalId
    ? hospitalDetails[selectedHospitalId] || null
    : null;

  const statusCounts = useMemo(() => {
    const counts = { ok: 0, warn: 0, danger: 0 };
    for (const h of world.hospitals) {
      if (counts[h.status] !== undefined) {
        counts[h.status] += 1;
      }
    }
    return counts;
  }, [world.hospitals]);

  const highlightedHospitalIds = useMemo(() => {
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      return new Set(
        world.hospitals
          .filter((h) => h.name.toLowerCase().includes(q))
          .map((h) => h.id)
      );
    }
    if (statusHighlight) {
      return new Set(
        world.hospitals
          .filter((h) => h.status === statusHighlight)
          .map((h) => h.id)
      );
    }
    return null;
  }, [world.hospitals, searchQuery, statusHighlight]);

  const handleSelectHospital = (id) => {
    setSelectedHospitalId(id);
    clearPatientDetail();
    requestHospitalDetail(id);
    const target = world.hospitals.find((h) => h.id === id);
    if (target) {
      mapRef.current?.flyTo(target.x, target.y, 1.55);
    }
  };

  const handleBackToSummary = () => {
    setSelectedHospitalId(null);
    clearPatientDetail();
    mapRef.current?.resetView();
  };

  const handleChangeCityFilter = (city) => {
    setCityFilter(city);
    if (city === 'all') {
      mapRef.current?.resetView();
    } else if (CITY_FOCUS[city]) {
      const { x, y, zoom } = CITY_FOCUS[city];
      mapRef.current?.flyTo(x, y, zoom);
    }
  };

  const handleClickStatusChip = (status) => {
    window.clearTimeout(statusTimerRef.current);
    setStatusHighlight(status);
    statusTimerRef.current = window.setTimeout(() => {
      setStatusHighlight(null);
    }, 2000);
  };

  const handleToggleBridge = (edgeId) => {
    const current = world.bridges.find((b) => b.id === edgeId);
    if (!current) return;
    setBridge(edgeId, !current.closed);
  };

  return (
    <div className="relative h-full w-full overflow-hidden">
      <MapCanvas
        ref={mapRef}
        cities={world.cities}
        nodes={world.nodes}
        edges={world.edges}
        hospitals={world.hospitals}
        selectedHospitalId={selectedHospitalId}
        highlightedHospitalIds={highlightedHospitalIds}
        walkinsRef={walkinsRef}
        ambulancesRef={ambulancesRef}
        paused={world.paused}
        canToggleBridge={user.role === 'dinkes' && connected}
        onToggleBridge={handleToggleBridge}
        onSelectHospital={handleSelectHospital}
        onClearSelection={handleBackToSummary}
      />

      <PetaLeftCard
        user={user}
        kpi={world.kpi}
        hospitals={world.hospitals}
        cityFilter={cityFilter}
        searchQuery={searchQuery}
        selectedHospital={selectedHospital}
        selectedHospitalDetail={selectedHospitalDetail}
        selectedPatientCode={selectedPatientDetail?.code || null}
        hasActiveQueue={Boolean(sim.myQueue)}
        onRegisterWarga={(rsId, unit) => {
          sim.registerWarga(rsId, unit);
          onNavigate?.('antrean');
        }}
        onGoToRsSaya={() => onNavigate?.('rs_saya')}
        onChangeCityFilter={handleChangeCityFilter}
        onSelectHospital={handleSelectHospital}
        onSelectPatient={requestPatientDetail}
        onBackToSummary={handleBackToSummary}
      />

      <PatientDetailPanel
        patient={selectedPatientDetail}
        onClose={clearPatientDetail}
      />

      <PetaOverlays
        userRole={user.role}
        connected={connected}
        statusCounts={statusCounts}
        activeStatusFilter={statusHighlight}
        onClickStatusChip={handleClickStatusChip}
        autoReferral={world.policy?.autoReferral ?? true}
        onToggleAutoReferral={setAutoReferral}
        hospitals={world.hospitals}
        activeOutbreaks={world.activeOutbreaks || []}
        undoInfo={world.undoInfo}
        onTriggerOutbreak={(cityId) => triggerScenario('wabah', { cityId })}
        onTriggerMassCasualty={(hospitalId) => triggerScenario('kecelakaan', { hospitalId })}
        onUndo={undoLastAction}
        onResetSimulation={resetSimulation}
        bridges={world.bridges}
        onToggleBridge={handleToggleBridge}
        paused={world.paused}
        speed={world.speed}
        simTime={world.simTime}
        simTimeText={world.simTimeText}
        onTogglePause={() => sendControl(world.paused ? 'play' : 'pause')}
        onChangeSpeed={(s) => sendControl('speed', s)}
        onZoomIn={() => mapRef.current?.zoomIn()}
        onZoomOut={() => mapRef.current?.zoomOut()}
        onResetView={() => {
          setCityFilter('all');
          setSelectedHospitalId(null);
          mapRef.current?.resetView();
        }}
      />

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
