import { useState } from 'react';
import { IonButton, IonDatetime, IonIcon, IonModal } from '@ionic/react';
import { calendarOutline, chevronForward } from 'ionicons/icons';
import { calculateAge } from '../utils/helpers';
import './BirthdatePicker.css';

type BirthdatePickerProps = {
  /** Fecha en formato AAAA-MM-DD, o '' si todavía no se eligió. */
  value: string;
  onChange: (value: string) => void;
};

/** Año en el que se abre la rueda si aún no hay fecha (más cerca de la mayoría que el año actual). */
const DEFAULT_DATE = '2000-01-01';

const pad = (n: number) => String(n).padStart(2, '0');
const toIso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const formatBirthdate = (value: string) => {
  const [y, m, d] = value.split('-').map(Number);
  if (!y || !m || !d) return '';
  return new Date(y, m - 1, d).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' });
};

/**
 * Fecha de nacimiento con ruedas (día · mes · año), como el selector propio del teléfono,
 * dentro de una hoja que se abre desde abajo. Se confirma con "Listo".
 */
const BirthdatePicker: React.FC<BirthdatePickerProps> = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value || DEFAULT_DATE);

  const today = new Date();
  const min = new Date(today.getFullYear() - 110, 0, 1);
  const age = value ? calculateAge(value) : null;

  return (
    <div className="birthdate-picker">
      <span className="birthdate-label" id="birthdate-label">
        Fecha de nacimiento
      </span>
      <button
        type="button"
        className={`birthdate-field${value ? '' : ' is-empty'}`}
        aria-labelledby="birthdate-label birthdate-value"
        onClick={() => {
          setDraft(value || DEFAULT_DATE);
          setOpen(true);
        }}
      >
        <IonIcon icon={calendarOutline} aria-hidden="true" />
        <span id="birthdate-value">{value ? formatBirthdate(value) : 'Toca para elegir tu fecha'}</span>
        <IonIcon icon={chevronForward} aria-hidden="true" className="birthdate-chevron" />
      </button>
      <p className="birthdate-hint" aria-live="polite">
        {age !== null ? `Tienes ${age} ${age === 1 ? 'año' : 'años'}.` : 'Desliza el día, el mes y el año.'}
      </p>

      <IonModal
        className="birthdate-sheet"
        isOpen={open}
        onDidDismiss={() => setOpen(false)}
        initialBreakpoint={1}
        breakpoints={[0, 1]}
      >
        <div className="birthdate-sheet-body">
          <h2>¿Cuándo naciste?</h2>
          <IonDatetime
            presentation="date"
            preferWheel
            locale="es-ES"
            min={toIso(min)}
            max={toIso(today)}
            value={draft}
            onIonChange={(e) => {
              const next = e.detail.value;
              if (typeof next === 'string') setDraft(next.slice(0, 10));
            }}
          />
          <p className="birthdate-preview">{formatBirthdate(draft)}</p>
          <div className="birthdate-sheet-actions">
            <IonButton fill="outline" color="medium" onClick={() => setOpen(false)}>
              Cancelar
            </IonButton>
            <IonButton
              onClick={() => {
                onChange(draft);
                setOpen(false);
              }}
            >
              Listo
            </IonButton>
          </div>
        </div>
      </IonModal>
    </div>
  );
};

export default BirthdatePicker;
