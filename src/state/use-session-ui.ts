import { useState } from 'react';
import type { Tariff } from '../core/types';
import { localDate } from '../core/time';
import type { SessionData, SessionUi } from './session';

type UpdateUi = ((patch: Partial<SessionUi>) => void) | undefined;

export function useImportUi(data: SessionData, ui: SessionUi | undefined, updateUi: UpdateUi) {
  const saved = ui?.import;
  const [start, setStartState] = useState(saved?.start || localDate(data.period.start));
  const [end, setEndState] = useState(saved?.end || localDate(data.period.end));
  const [selected, setSelectedState] = useState(
    saved?.selected.length ? saved.selected : data.supplies.map((supply) => supply.ref),
  );
  const setStart = (value: string) => {
    setStartState(value);
    updateUi?.({ import: { start: value, end, selected } });
  };
  const setEnd = (value: string) => {
    setEndState(value);
    updateUi?.({ import: { start, end: value, selected } });
  };
  const setSelected = (value: string[]) => {
    setSelectedState(value);
    updateUi?.({ import: { start, end, selected: value } });
  };
  return { start, end, selected, setStart, setEnd, setSelected };
}

export function useCoverageUi(ui: SessionUi | undefined, updateUi: UpdateUi) {
  const [bills, setBillsState] = useState(ui?.coverage.bills ?? []);
  const [uniform, setUniformState] = useState(ui?.coverage.uniform ?? false);
  const setBills = (value: typeof bills) => {
    setBillsState(value);
    updateUi?.({ coverage: { bills: value, uniform } });
  };
  const setUniform = (value: boolean) => {
    setUniformState(value);
    updateUi?.({ coverage: { bills, uniform: value } });
  };
  return { bills, uniform, setBills, setUniform };
}

export function useChargingUi(
  data: SessionData,
  ui: SessionUi | undefined,
  updateUi: UpdateUi,
  defaultProviderId: string,
) {
  const saved = ui?.charging;
  const [providerId, setProviderIdState] = useState(
    initialProviderId(saved?.providerId, defaultProviderId),
  );
  const [supplyRef, setSupplyRefState] = useState(
    saved?.supplyRef || data.supplies.find((supply) => supply.fuel === 'electricity')?.ref || '',
  );
  const [power, setPowerState] = useState(saved?.power ?? '7');
  const setProviderId = (value: string) => {
    setProviderIdState(value);
    updateUi?.({ charging: { providerId: value, supplyRef, power } });
  };
  const setSupplyRef = (value: string) => {
    setSupplyRefState(value);
    updateUi?.({ charging: { providerId, supplyRef: value, power } });
  };
  const setPower = (value: string) => {
    setPowerState(value);
    updateUi?.({ charging: { providerId, supplyRef, power: value } });
  };
  return { providerId, supplyRef, power, setProviderId, setSupplyRef, setPower };
}

function initialProviderId(saved: string | undefined, fallback: string): string {
  return saved && saved !== 'synthetic' ? saved : fallback;
}

export function useTariffUi(ui: SessionUi | undefined, updateUi: UpdateUi) {
  const saved = ui?.tariffs;
  const [draft, setDraftState] = useState<Tariff | null>(saved?.draft ?? null);
  const [postcode, setPostcode] = useState(saved?.postcode ?? '');
  const [region, setRegion] = useState(saved?.region ?? '');
  const setDraft = (value: Tariff | null) => {
    setDraftState(value);
    updateUi?.({ tariffs: { draft: value, postcode, region } });
  };
  const changeLocation = (nextPostcode: string, nextRegion: string) => {
    setPostcode(nextPostcode);
    setRegion(nextRegion);
    updateUi?.({ tariffs: { draft, postcode: nextPostcode, region: nextRegion } });
  };
  return { draft, setDraft, postcode, region, changeLocation };
}

export function useTariffLocation(
  postcode: string,
  region: string,
  changeLocation: (postcode: string, region: string) => void,
) {
  const [postcodeValue, setPostcode] = useState(postcode);
  const [regionValue, setRegion] = useState(region);
  const changePostcode = (value: string) => {
    setPostcode(value);
    changeLocation(value, regionValue);
  };
  const changeRegion = (value: string) => {
    setRegion(value);
    changeLocation(postcodeValue, value);
  };
  return { postcodeValue, regionValue, changePostcode, changeRegion };
}
