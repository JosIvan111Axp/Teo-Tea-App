import { useState } from 'react';
import { IonButton, IonIcon, IonInput } from '@ionic/react';
import { add, closeCircle } from 'ionicons/icons';
import './TagEditor.css';

type TagEditorProps = {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  suggestions: string[];
  placeholder?: string;
  max?: number;
};

const MAX_LENGTH = 40;

/**
 * Lista de etiquetas (habilidades, gustos) sin tener que escribir comas:
 * se agregan escribiendo o tocando una sugerencia, y se quitan con la ✕.
 */
const TagEditor: React.FC<TagEditorProps> = ({ label, values, onChange, suggestions, placeholder, max = 12 }) => {
  const [draft, setDraft] = useState('');
  const has = (tag: string) => values.some((v) => v.toLocaleLowerCase() === tag.toLocaleLowerCase());
  const full = values.length >= max;

  const addTag = (raw: string) => {
    const tag = raw.trim().slice(0, MAX_LENGTH);
    if (!tag || has(tag) || full) return;
    onChange([...values, tag]);
  };

  const submitDraft = () => {
    // Si alguien escribe varias separadas por comas, también funciona.
    const parts = draft.split(',').map((p) => p.trim()).filter(Boolean);
    const next = [...values];
    for (const part of parts) {
      const tag = part.slice(0, MAX_LENGTH);
      if (next.length < max && !next.some((v) => v.toLocaleLowerCase() === tag.toLocaleLowerCase())) next.push(tag);
    }
    onChange(next);
    setDraft('');
  };

  const pending = suggestions.filter((s) => !has(s));

  return (
    <div className="tag-editor">
      <div className="tag-editor-head">
        <span className="tag-editor-label">{label}</span>
        <span className="tag-editor-count">
          {values.length}/{max}
        </span>
      </div>

      {values.length > 0 ? (
        <ul className="tag-editor-list" aria-label={`${label} elegidas`}>
          {values.map((tag) => (
            <li key={tag}>
              <span>{tag}</span>
              <button
                type="button"
                aria-label={`Quitar ${tag}`}
                onClick={() => onChange(values.filter((v) => v !== tag))}
              >
                <IonIcon icon={closeCircle} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="tag-editor-empty">Todavía no agregaste ninguna.</p>
      )}

      <div className="tag-editor-add">
        <IonInput
          aria-label={`Agregar a ${label}`}
          fill="outline"
          placeholder={placeholder ?? 'Escribe y toca Agregar'}
          value={draft}
          maxlength={MAX_LENGTH * 3}
          disabled={full}
          enterkeyhint="done"
          onIonInput={(e) => setDraft(e.detail.value ?? '')}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              submitDraft();
            }
          }}
        />
        <IonButton type="button" fill="solid" color="secondary" disabled={!draft.trim() || full} onClick={submitDraft}>
          <IonIcon slot="start" icon={add} aria-hidden="true" />
          Agregar
        </IonButton>
      </div>

      {pending.length > 0 && !full && (
        <div className="tag-editor-suggestions">
          <span>Ideas (toca para agregar):</span>
          <div>
            {pending.map((s) => (
              <button key={s} type="button" onClick={() => addTag(s)}>
                + {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TagEditor;
