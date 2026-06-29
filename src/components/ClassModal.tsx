import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Save, BookOpen, Film, Layers, FileText, Calendar, Link,
  Eye, ArrowLeft, Video, Presentation, FilePenLine, Clock, CalendarDays, CheckCircle2
} from 'lucide-react';
import { ClassItem } from '../types';

interface ClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (classItem: ClassItem, keepOpen?: boolean) => void;
  initialClass: ClassItem | null;
  associatedSchools?: string[];
  onAssignClass?: (sourceClass: ClassItem, schools: string[], unlockAt: string, deadline: string) => void | Promise<void>;
}

function getEmbedUrl(input: string): string {
  if (!input) return '';
  const trimmed = input.trim();
  
  // Try to extract URL from src="..." parameter
  const srcRegex = /src\s*=\s*["'“«’‘]([^"'”»’‘]+)["'”»’‘]/i;
  const match = trimmed.match(srcRegex);
  if (match && match[1]) {
    return match[1].trim().replace(/["'”»’‘>]+$/, '').trim();
  }
  
  return trimmed;
}

// Helper functions to prevent broken embeds
function extractYoutubeId(input: string): string {
  if (!input) return '';
  const trimmed = input.trim();
  
  // Check if it's already just an 11-character ID containing letters, numbers, hyphens or underscores
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }
  
  // 1. watch?v=ID or &v=ID
  const watchMatch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (watchMatch) return watchMatch[1];
  
  // 2. /embed/ID
  const embedMatch = trimmed.match(/\/embed\/([a-zA-Z0-9_-]{11})/);
  if (embedMatch) return embedMatch[1];
  
  // 3. youtu.be/ID
  const shortMatch = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shortMatch) return shortMatch[1];
  
  // 4. v/ID
  const vMatch = trimmed.match(/\/v\/([a-zA-Z0-9_-]{11})/);
  if (vMatch) return vMatch[1];

  return trimmed;
}

export default function ClassModal({
  isOpen,
  onClose,
  onSave,
  initialClass,
  associatedSchools = [],
  onAssignClass
}: ClassModalProps) {
  const [level, setLevel] = useState(0);
  const [week, setWeek] = useState(1);
  const [title, setTitle] = useState('');
  const [unlockAt, setUnlockAt] = useState('');
  const [deadline, setDeadline] = useState('');
  const [text, setText] = useState('');
  const [videoId, setVideoId] = useState('');
  const [slidesUrl, setSlidesUrl] = useState('');
  const [actTitle, setActTitle] = useState('');
  const [actDesc, setActDesc] = useState('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewTab, setPreviewTab] = useState<'content' | 'video' | 'slides' | 'activity'>('content');
  const [hasDraft, setHasDraft] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState('');

  // States for Direct Publishing & Confirmation
  const [isPublishingNow, setIsPublishingNow] = useState(false);
  const [publishSchools, setPublishSchools] = useState<string[]>([]);
  const [publishUnlockAt, setPublishUnlockAt] = useState('');
  const [publishDeadline, setPublishDeadline] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmationData, setConfirmationData] = useState<{
    schools: string[];
    unlockAt: string;
    isScheduled: boolean;
  } | null>(null);

  // 1. Check for drafts on load
  useEffect(() => {
    if (isOpen && !initialClass) {
      const saved = localStorage.getItem('fintly_class_draft');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && (parsed.title || parsed.text || parsed.actTitle || parsed.videoId)) {
            setHasDraft(true);
            if (parsed.savedAt) {
              const d = new Date(parsed.savedAt);
              setDraftSavedAt(
                d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) + 
                ' del ' + 
                d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })
              );
            }
          }
        } catch (e) {
          console.error(e);
        }
      } else {
        setHasDraft(false);
      }
    } else {
      setHasDraft(false);
    }
  }, [isOpen, initialClass]);

  // 2. Debounced autosave effect
  useEffect(() => {
    if (!isOpen || initialClass) return;

    const delayDebounce = setTimeout(() => {
      const anyContent = title.trim() || text.trim() || videoId.trim() || slidesUrl.trim() || actTitle.trim() || actDesc.trim();
      if (anyContent) {
        const draft = {
          level,
          week,
          title,
          unlockAt,
          deadline,
          text,
          videoId,
          slidesUrl,
          actTitle,
          actDesc,
          savedAt: new Date().toISOString()
        };
        localStorage.setItem('fintly_class_draft', JSON.stringify(draft));
      }
    }, 1500);

    return () => clearTimeout(delayDebounce);
  }, [isOpen, initialClass, level, week, title, unlockAt, deadline, text, videoId, slidesUrl, actTitle, actDesc]);

  // Handler to Restore Draft
  const handleRestoreDraft = () => {
    const saved = localStorage.getItem('fintly_class_draft');
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved);
      if (parsed) {
        setLevel(parsed.level ?? 0);
        setWeek(parsed.week ?? 1);
        setTitle(parsed.title ?? '');
        setUnlockAt(parsed.unlockAt ?? '');
        setDeadline(parsed.deadline ?? '');
        setText(parsed.text ?? '');
        setVideoId(parsed.videoId ?? '');
        setSlidesUrl(parsed.slidesUrl ?? '');
        setActTitle(parsed.actTitle ?? '');
        setActDesc(parsed.actDesc ?? '');
        setHasDraft(false);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Handler to Dismiss Draft
  const handleDismissDraft = () => {
    localStorage.removeItem('fintly_class_draft');
    setHasDraft(false);
  };

  // Rellenar datos si estamos editando
  useEffect(() => {
    setIsPreviewOpen(false);
    setPreviewTab('content');
    setIsPublishingNow(false);
    setShowConfirmation(false);
    setConfirmationData(null);

    // Initialize publish fields
    const schoolsList = associatedSchools || [
      'Colegio IDES',
      'Colegio San Martín',
      'Colegio Belgrano',
      'Colegio Sarmiento'
    ];
    setPublishSchools(schoolsList);
    setPublishUnlockAt(initialClass?.unlockAt || new Date().toISOString().substring(0, 16));
    setPublishDeadline(initialClass?.deadline || new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().substring(0, 16));

    if (initialClass) {
      setLevel(initialClass.level);
      setWeek(initialClass.week);
      setTitle(initialClass.title);
      setUnlockAt(initialClass.unlockAt || '');
      setDeadline(initialClass.deadline || '');
      // Para mostrar en el textarea texto plano limpio reemplazamos etiquetas html de primer nivel si hay
      const cleanText = initialClass.text
        ? initialClass.text
            .replace(/<p>/g, '')
            .replace(/<\/p>/g, '\n\n')
            .replace(/<br>/g, '\n')
            .replace(/<h3>/g, '### ')
            .replace(/<\/h3>/g, '\n')
            .replace(/<ul>/g, '')
            .replace(/<\/ul>/g, '')
            .replace(/<li>/g, '* ')
            .replace(/<\/li>/g, '\n')
            .trim()
        : '';
      setText(cleanText);
      const rawVideoId = initialClass.videoId || '';
      const initialVideoUrl = rawVideoId && !rawVideoId.includes('youtube.com') && !rawVideoId.includes('youtu.be')
        ? `https://www.youtube.com/watch?v=${rawVideoId}`
        : rawVideoId;
      setVideoId(initialVideoUrl);
      setSlidesUrl(initialClass.slidesUrl || '');
      setActTitle(initialClass.actTitle || '');
      setActDesc(initialClass.actDesc || '');
    } else {
      // Limpiar formulario para nueva clase si no hay borrador activo o si ya fue descartado
      const saved = localStorage.getItem('fintly_class_draft');
      if (!saved) {
        setLevel(0);
        setWeek(1);
        setTitle('');
        setUnlockAt('');
        setDeadline('');
        setText('');
        setVideoId('');
        setSlidesUrl('');
        setActTitle('');
        setActDesc('');
      }
    }
  }, [initialClass, isOpen, associatedSchools]);

  // Validation function
  const validateFields = (): string | null => {
    if (!title.trim() || !week) {
      return 'Por favor completa al menos la semana y el título.';
    }

    const trimmedVideo = videoId.trim();
    if (!trimmedVideo) {
      return 'Por favor ingresa el enlace (link) completo de YouTube.';
    }

    const isYoutubeUrl = trimmedVideo.includes('youtube.com') || trimmedVideo.includes('youtu.be');
    if (!isYoutubeUrl) {
      return 'Por favor, pega el link completo de YouTube, no solo el ID (ejemplo: https://www.youtube.com/watch?v=dQw4w9WgXcQ).';
    }

    const extractedId = extractYoutubeId(trimmedVideo);
    if (!extractedId || extractedId === trimmedVideo) {
      return 'No se pudo extraer un ID de video válido de la URL de YouTube ingresada. Asegúrate de que represente un link válido.';
    }

    return null;
  };

  // Helper to build class item
  const buildClassItem = (extractedId: string): ClassItem => {
    // Convertimos de Markdown ultra simple/texto plano de vuelta a los tags HTML de Martina
    let htmlText = text.trim();
    if (htmlText) {
      // Reemplazamos encabezados de markdown
      htmlText = htmlText.replace(/### (.*?)\n/g, '<h3>$1</h3>');
      // Reemplazamos listas
      htmlText = htmlText.replace(/\* (.*?)\n/g, '<li>$1</li>');
      // Envolver saltos de línea compuestos
      htmlText = htmlText
        .split('\n\n')
        .map((p) => {
          if (p.startsWith('<h3>') || p.startsWith('<li>')) return p;
          if (p.includes('<li>')) return `<ul>${p}</ul>`;
          return `<p>${p.replace(/\n/g, '<br>')}</p>`;
        })
        .join('');
    }

    return {
      level,
      week: Number(week),
      title: title.trim(),
      unlockAt,
      deadline,
      text: htmlText || `<p>${text}</p>`,
      videoId: extractedId,
      slidesUrl: slidesUrl.trim(),
      actTitle: actTitle.trim(),
      actDesc: actDesc.trim(),
    };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateFields();
    if (validationError) {
      alert(validationError);
      return;
    }

    const extractedId = extractYoutubeId(videoId.trim());
    const classItem = buildClassItem(extractedId);

    localStorage.removeItem('fintly_class_draft');
    onSave(classItem);
  };

  const handleDirectPublishClick = () => {
    const validationError = validateFields();
    if (validationError) {
      alert(validationError);
      return;
    }
    setIsPublishingNow(true);
  };

  const handleConfirmPublish = async () => {
    if (publishSchools.length === 0) {
      alert('Por favor selecciona al menos un colegio para publicar la clase.');
      return;
    }

    const extractedId = extractYoutubeId(videoId.trim());
    const classItem = buildClassItem(extractedId);

    try {
      // 1. Guardar la clase en el Syllabus (usando keepOpen = true para evitar el cierre inmediato)
      onSave(classItem, true);

      // 2. Asignar/subir la clase a los colegios seleccionados
      if (onAssignClass) {
        await onAssignClass(classItem, publishSchools, publishUnlockAt, publishDeadline);
      }

      // 3. Limpiar borradores
      localStorage.removeItem('fintly_class_draft');

      // 4. Configurar datos de confirmación
      const isScheduled = publishUnlockAt ? new Date(publishUnlockAt) > new Date() : false;
      setConfirmationData({
        schools: publishSchools,
        unlockAt: publishUnlockAt,
        isScheduled,
      });
      setShowConfirmation(true);
    } catch (error) {
      console.error("Error al subir la clase directamente:", error);
      alert("Hubo un error al subir la clase. Por favor vuelve a intentarlo.");
    }
  };

  if (!isOpen) return null;

  // 1. CONFIRMATION VIEW
  if (showConfirmation && confirmationData) {
    return (
      <div className="fixed inset-0 z-110 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto no-scrollbar">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.3 }}
          className="bg-[#0f0f22] light:bg-white border border-violet-900/40 light:border-neutral-200 rounded-3xl w-full max-w-md p-8 flex flex-col items-center text-center shadow-2xl"
        >
          <div className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-400 light:bg-emerald-50 light:text-emerald-600 mb-6 border border-emerald-500/25">
            <CheckCircle2 className="w-10 h-10 animate-bounce" />
          </div>

          <h3 className="font-display font-extrabold text-white light:text-neutral-900 text-2xl mb-2">
            {confirmationData.isScheduled ? '¡Clase Programada!' : '¡Clase Subida con Éxito!'}
          </h3>

          <p className="text-gray-450 light:text-neutral-600 text-sm max-w-sm mb-6 leading-relaxed">
            {confirmationData.isScheduled ? (
              <span>
                La clase <strong>"{title}"</strong> ha sido guardada en el Syllabus y programada correctamente. Se habilitará de forma automática para los alumnos.
              </span>
            ) : (
              <span>
                La clase <strong>"{title}"</strong> ha sido guardada en el Syllabus y publicada directamente. Ya está disponible para los alumnos.
              </span>
            )}
          </p>

          <div className="w-full bg-[#14132b]/50 light:bg-neutral-50 border border-white/5 light:border-neutral-200 rounded-2xl p-5 mb-8 text-left space-y-3.5">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500 block mb-1">
                Colegios asignados ({confirmationData.schools.length})
              </span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {confirmationData.schools.map((s) => (
                  <span key={s} className="px-2.5 py-1 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-300 light:bg-violet-50 light:text-violet-700 light:border-violet-100 text-xs font-medium">
                    {s}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500 block mb-1">
                Estado y Planificación
              </span>
              <div className="flex items-center gap-2 text-xs text-white light:text-neutral-800 font-semibold mt-1">
                <Clock className="w-4 h-4 text-violet-400 light:text-violet-600 shrink-0" />
                <span>
                  {confirmationData.isScheduled ? (
                    <span className="text-amber-400 light:text-amber-700 font-bold">
                      Programada para el: {(() => {
                        const d = new Date(confirmationData.unlockAt);
                        return d.toLocaleDateString('es-AR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        });
                      })()}
                    </span>
                  ) : (
                    <span className="text-emerald-400 light:text-emerald-600 font-bold">
                      Publicada de inmediato (Live)
                    </span>
                  )}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              setShowConfirmation(false);
              onClose();
            }}
            className="liquid-glass-btn w-full py-3.5 px-6 rounded-xl text-sm font-bold shadow-lg shadow-violet-950/20 cursor-pointer text-center"
          >
            Aceptar y Finalizar
          </button>
        </motion.div>
      </div>
    );
  }

  // 2. DIRECT PUBLISHING CONFIGURATION VIEW
  if (isPublishingNow) {
    const schoolsList = associatedSchools || [
      'Colegio IDES',
      'Colegio San Martín',
      'Colegio Belgrano',
      'Colegio Sarmiento'
    ];
    return (
      <div className="fixed inset-0 z-110 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto no-scrollbar">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.3 }}
          className="bg-[#0f0f22] light:bg-white border border-violet-900/40 light:border-neutral-200 rounded-3xl w-full max-w-lg flex flex-col overflow-hidden shadow-2xl max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-850 light:border-neutral-200 p-6 bg-white/[0.02] light:bg-neutral-50/50">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-violet-400 light:text-violet-600" />
              <h3 className="font-display font-extrabold text-white light:text-neutral-900 text-lg">
                Configurar publicación directa
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setIsPublishingNow(false)}
              className="w-8 h-8 rounded-lg bg-white/5 light:bg-neutral-100 hover:bg-white/10 light:hover:bg-neutral-200 text-gray-400 light:text-neutral-500 hover:text-white light:hover:text-neutral-800 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
            {/* Quick reminder card */}
            <div className="bg-violet-950/15 border border-violet-500/20 rounded-2xl p-4 flex gap-3 text-xs leading-relaxed text-violet-300 light:bg-violet-50/50 light:text-violet-750 light:border-violet-100">
              <BookOpen className="w-4 h-4 shrink-0 text-violet-400 light:text-violet-600 mt-0.5" />
              <div>
                Al subir la clase, esta se guardará como plantilla en el <strong>Syllabus Académico</strong> y se asignará automáticamente a los colegios que marques abajo con las fechas que configures.
              </div>
            </div>

            {/* School Selector */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-400 light:text-neutral-500 uppercase tracking-wider">
                  Colegios donde publicar esta clase
                </label>
                <button
                  type="button"
                  onClick={() => {
                    if (publishSchools.length === schoolsList.length) {
                      setPublishSchools([]);
                    } else {
                      setPublishSchools([...schoolsList]);
                    }
                  }}
                  className="text-[10px] text-violet-400 light:text-violet-700 font-bold hover:underline cursor-pointer"
                >
                  {publishSchools.length === schoolsList.length ? 'Desmarcar todos' : 'Marcar todos'}
                </button>
              </div>

              <div className="space-y-1.5 border border-white/5 light:border-neutral-200 bg-black/10 light:bg-neutral-50 p-4 rounded-xl">
                {schoolsList.map((schoolName) => {
                  const isSelected = publishSchools.includes(schoolName);
                  return (
                    <label
                      key={schoolName}
                      className="flex items-start gap-2.5 p-1.5 hover:bg-white/[0.02] light:hover:bg-neutral-105 rounded-lg cursor-pointer text-xs"
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {
                          if (isSelected) {
                            setPublishSchools(publishSchools.filter((name) => name !== schoolName));
                          } else {
                            setPublishSchools([...publishSchools, schoolName]);
                          }
                        }}
                        className="mt-0.5 rounded text-violet-500 focus:ring-violet-500 cursor-pointer"
                      />
                      <span className="text-white light:text-neutral-800 font-medium leading-tight">
                        {schoolName}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Dates row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 light:text-neutral-500 uppercase tracking-wider block">
                  Habilitar desde el (Unlock)
                </label>
                <input
                  type="datetime-local"
                  value={publishUnlockAt}
                  onChange={(e) => setPublishUnlockAt(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 light:bg-white light:border-neutral-300 rounded-xl px-4 py-2.5 text-white light:text-neutral-800 text-sm focus:outline-none focus:border-violet-500"
                />
                <span className="text-[10px] text-gray-500 block">
                  Si dejas la fecha actual, los alumnos podrán verla inmediatamente. Si ingresas una fecha futura, quedará programada.
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-400 light:text-neutral-500 uppercase tracking-wider block">
                  Límite de Entrega (Deadline)
                </label>
                <input
                  type="datetime-local"
                  value={publishDeadline}
                  onChange={(e) => setPublishDeadline(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 light:bg-white light:border-neutral-300 rounded-xl px-4 py-2.5 text-white light:text-neutral-800 text-sm focus:outline-none focus:border-violet-500"
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="bg-white/2 light:bg-neutral-50 border-t border-gray-850 light:border-neutral-200 p-6 flex justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setIsPublishingNow(false)}
              className="px-5 py-2.5 bg-white/5 light:bg-neutral-100 hover:bg-white/10 light:hover:bg-neutral-200 text-gray-300 light:text-neutral-700 hover:text-white light:hover:text-neutral-900 rounded-xl text-sm font-semibold transition-colors cursor-pointer"
            >
              Volver a Editar
            </button>
            <button
              onClick={handleConfirmPublish}
              disabled={publishSchools.length === 0}
              className="liquid-glass-btn flex items-center gap-2 px-6 py-2.5 text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-center"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Confirmar y Subir ahora</span>
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-110 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto no-scrollbar">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.3 }}
        className="bg-[#0f0f22] light:bg-white border border-violet-900/40 light:border-neutral-200 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
      >
        {/* Header modal */}
        <div className="flex items-center justify-between border-b border-gray-800 light:border-neutral-200 p-6 bg-white/[0.02] light:bg-neutral-50/50">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-violet-400 light:text-violet-600" />
            <h3 className="font-display font-extrabold text-white light:text-neutral-900 text-lg">
              {initialClass ? 'Editar clase cargada' : 'Crear nueva clase'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/5 light:bg-neutral-100 hover:bg-white/10 light:hover:bg-neutral-200 text-gray-400 light:text-neutral-500 hover:text-white light:hover:text-neutral-800 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 no-scrollbar">
          {hasDraft && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              className="bg-violet-950/45 border border-violet-500/25 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs mb-2 overflow-hidden light:bg-violet-50 light:border-violet-200"
            >
              <div className="flex items-start gap-2.5">
                <FileText className="w-4 h-4 text-violet-400 light:text-violet-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-white light:text-neutral-900">Borrador auto-guardado encontrado</h4>
                  <p className="text-gray-400 light:text-neutral-600 text-[11px] mt-0.5">
                    Tienes una versión sin guardar de esta lección del <span className="font-semibold text-violet-300 light:text-violet-700">{draftSavedAt}</span>.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                <button
                  type="button"
                  onClick={handleRestoreDraft}
                  className="liquid-glass-btn px-4 py-2 text-xs font-bold"
                >
                  Restaurar
                </button>
                <button
                  type="button"
                  onClick={handleDismissDraft}
                  className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 dark:text-gray-400 light:bg-neutral-100 light:hover:bg-neutral-200 light:text-neutral-600 text-gray-300 font-bold rounded-lg transition-all cursor-pointer"
                >
                  Descartar
                </button>
              </div>
            </motion.div>
          )}
          {/* Level and Week Inputs Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 light:text-neutral-500 uppercase tracking-wider block">
                Nivel del programa
              </label>
              <select
                value={level}
                onChange={(e) => setLevel(Number(e.target.value))}
                className="w-full bg-white/5 border border-white/10 light:bg-white light:border-neutral-300 rounded-xl px-4 py-2.5 text-white light:text-neutral-800 text-sm focus:outline-none focus:border-violet-500"
              >
                <option value="0" className="bg-[#12122a] text-white light:bg-white light:text-neutral-800">Nivel 0 — Fundamentos</option>
                <option value="1" className="bg-[#12122a] text-white light:bg-white light:text-neutral-800">Nivel 1 — Hábitos financieros</option>
                <option value="2" className="bg-[#12122a] text-white light:bg-white light:text-neutral-800">Nivel 2 — Inversión básica</option>
                <option value="3" className="bg-[#12122a] text-white light:bg-white light:text-neutral-800">Nivel 3 — Estrategia avanzada</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 light:text-neutral-500 uppercase tracking-wider block">
                Semana número #
              </label>
              <input
                type="number"
                min="1"
                required
                value={week}
                onChange={(e) => setWeek(Number(e.target.value))}
                placeholder="ej: 1"
                className="w-full bg-white/5 border border-white/10 light:bg-white light:border-neutral-300 rounded-xl px-4 py-2.5 text-white light:text-neutral-800 text-sm focus:outline-none focus:border-violet-500"
              />
            </div>
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-400 light:text-neutral-500 uppercase tracking-wider block">
              Título de la clase
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="ej: ¿Qué es el dinero? o La regla de ahorro 50/30/20"
              className="w-full bg-white/5 border border-white/10 light:bg-white light:border-neutral-300 rounded-xl px-4 py-2.5 text-white light:text-neutral-800 placeholder-gray-500 light:placeholder-neutral-400 text-sm focus:outline-none focus:border-violet-500"
            />
          </div>

          {/* Unlock Availability Date */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-400 light:text-neutral-500 uppercase tracking-wider block">
              Fecha de desbloqueo (Unlock)
            </label>
            <input
              type="datetime-local"
              value={unlockAt}
              onChange={(e) => setUnlockAt(e.target.value)}
              className="w-full bg-white/5 border border-white/10 light:bg-white light:border-neutral-300 rounded-xl px-4 py-2.5 text-white light:text-neutral-800 text-sm focus:outline-none focus:border-violet-500"
            />
            <span className="text-[10px] text-gray-500 light:text-neutral-500 block">
              Los alumnos visualizarán la clase bajo llave de candado ("próximamente") hasta cumplirse este plazo.
            </span>
          </div>

          {/* Content Divider */}
          <div className="flex items-center gap-3 pt-2">
            <BookOpen className="w-4 h-4 text-violet-400 light:text-violet-600" />
            <span className="text-xs font-bold text-violet-400 light:text-violet-600 uppercase tracking-widest">Contenido pedagógico</span>
            <div className="flex-1 h-px bg-violet-900/20 light:bg-violet-200/50" />
          </div>

          {/* Class Text contents body */}
          <div className="space-y-1.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-bold text-gray-400 light:text-neutral-500 uppercase tracking-wider block">
                Texto del contenido
              </label>
              
              {/* Toolbar de formato rápido */}
              <div className="flex flex-wrap items-center gap-1 pb-1 select-none">
                <button
                  type="button"
                  title="Insertar subtítulo h3"
                  onClick={() => {
                    setText(prev => prev + (prev.endsWith('\n') || prev === '' ? '' : '\n') + '### Siguiente Subtítulo\n');
                  }}
                  className="px-2 py-1 bg-white/5 hover:bg-white/10 light:bg-neutral-100 light:hover:bg-neutral-200 text-gray-300 light:text-neutral-700 hover:text-white rounded-xl text-[10px] font-bold transition-colors border border-white/5 light:border-neutral-200 cursor-pointer"
                >
                  Subtítulo (###)
                </button>
                <button
                  type="button"
                  title="Insertar viñeta de lista"
                  onClick={() => {
                    setText(prev => prev + (prev.endsWith('\n') || prev === '' ? '' : '\n') + '* Elemento de la lista\n');
                  }}
                  className="px-2 py-1 bg-white/5 hover:bg-white/10 light:bg-neutral-100 light:hover:bg-neutral-200 text-gray-300 light:text-neutral-700 hover:text-white rounded-xl text-[10px] font-bold transition-colors border border-white/5 light:border-neutral-200 cursor-pointer"
                >
                  Lista (*)
                </button>
                <button
                  type="button"
                  title="Insertar texto en negrita"
                  onClick={() => {
                    setText(prev => prev + '**negrita**');
                  }}
                  className="px-2.5 py-1 bg-white/5 hover:bg-white/10 light:bg-neutral-100 light:hover:bg-neutral-200 text-gray-300 light:text-neutral-700 hover:text-white rounded-xl text-[10px] font-extrabold transition-colors border border-white/5 light:border-neutral-200 cursor-pointer"
                >
                  B
                </button>
                <button
                  type="button"
                  title="Insertar texto en cursiva"
                  onClick={() => {
                    setText(prev => prev + '*itálica*');
                  }}
                  className="px-2.5 py-1 bg-white/5 hover:bg-white/10 light:bg-neutral-100 light:hover:bg-neutral-200 text-gray-300 light:text-neutral-700 hover:text-white rounded-xl text-[10px] font-semibold italic transition-colors border border-white/5 light:border-neutral-200 cursor-pointer"
                >
                  I
                </button>
                <button
                  type="button"
                  title="Insertar separador horizontal"
                  onClick={() => {
                    setText(prev => prev + (prev.endsWith('\n') || prev === '' ? '' : '\n') + '---\n');
                  }}
                  className="px-2 py-1 bg-white/5 hover:bg-white/10 light:bg-neutral-100 light:hover:bg-neutral-200 text-gray-300 light:text-neutral-700 hover:text-white rounded-xl text-[10px] font-bold transition-colors border border-white/5 light:border-neutral-200 cursor-pointer"
                >
                  — Separador
                </button>
                <button
                  type="button"
                  title="Cargar plantilla de ejemplo estructurada"
                  onClick={() => {
                    setText('### 1. Conceptos Claves de Ahorro\n\n¿Por qué ahorramos? El ahorro no es solo guardar dinero, sino postergar un consumo presente para asegurar un beneficio futuro.\n\n### 2. Método de la Regla 50/30/20\n\nEste es un sistema clásico y efectivo para ordenar tus ingresos:\n\n* **50% Necesidades**: Alquiler, servicios, comida indispensable.\n* **30% Deseos**: Salidas, entretenimiento, indumentaria por gusto.\n* **20% Ahorro e Inversión**: Fondo de emergencia, aportes a cuentas de acciones.\n\n---\n\n### 3. Conclusión Práctica\n\nMantener la consistencia supera ampliamente al volumen inicial. ¡Hazlo un hábito todos los meses!');
                  }}
                  className="px-2 py-1 bg-violet-600/15 hover:bg-violet-600/35 text-violet-300 light:bg-violet-50 light:text-violet-700 rounded-xl text-[10px] font-bold transition-colors border border-violet-500/20 cursor-pointer"
                >
                  ✨ Ejemplo
                </button>
              </div>
            </div>
            
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Usa doble salto de línea para nuevos párrafos.&#10;Puedes usar formados como:&#10;### Mi Título de sección&#10;* Un elemento de lista."
              className="w-full min-h-[140px] bg-white/5 border border-white/10 light:bg-white light:border-neutral-300 rounded-xl p-4 text-white light:text-neutral-800 placeholder-gray-500 light:placeholder-neutral-400 text-sm focus:outline-none focus:border-violet-500 font-sans transition-colors"
            />
          </div>

          {/* Visual Embedding resources row links */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 light:text-neutral-500 uppercase tracking-wider block">
                Link completo de YouTube (Obligatorio)
              </label>
              <input
                type="text"
                required
                value={videoId}
                onChange={(e) => setVideoId(e.target.value)}
                placeholder="ej: https://www.youtube.com/watch?v=dQw4w9WgXcQ"
                className="w-full bg-white/5 border border-white/10 light:bg-white light:border-neutral-300 rounded-xl px-4 py-2.5 text-white light:text-neutral-800 placeholder-gray-500 light:placeholder-neutral-400 text-sm focus:outline-none focus:border-violet-500"
              />
              <span className="text-[9px] text-[#8e8ea4] light:text-[#717188] italic block">
                Pega el link completo de YouTube. Es obligatorio ingresar un enlace completo para guardar.
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-400 light:text-neutral-500 uppercase tracking-wider block">
                Presentación o Slides (Gamma, Google Slides, Canva, Enlace o Código Iframe)
              </label>
              <textarea
                value={slidesUrl}
                onChange={(e) => setSlidesUrl(e.target.value)}
                placeholder='ej: <iframe src="https://gamma.app/embed/..." ...></iframe> o https://...'
                rows={2}
                className="w-full bg-white/5 border border-white/10 light:bg-white light:border-neutral-300 rounded-xl px-4 py-2 text-white light:text-neutral-800 placeholder-gray-500 light:placeholder-neutral-400 text-xs focus:outline-none focus:border-violet-500 resize-none font-mono"
              />
              <span className="text-[9px] text-[#8e8ea4] light:text-[#717188] italic block">
                Pega el código iframe completo de Gamma/Canva o el link de Google Slides. Se extraerá y auto-saneará automáticamente al guardar.
              </span>
            </div>
          </div>

          {/* Activity definition Area details */}
          <div className="flex items-center gap-3 pt-2">
            <FileText className="w-4 h-4 text-indigo-400 light:text-indigo-600" />
            <span className="text-xs font-bold text-indigo-400 light:text-indigo-600 uppercase tracking-widest">Actividad de desafío</span>
            <div className="flex-1 h-px bg-indigo-900/20 light:bg-indigo-100" />
          </div>

          {/* Activity title */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-400 light:text-neutral-500 uppercase tracking-wider block">
              Título del desafío práctico
            </label>
            <input
              type="text"
              value={actTitle}
              onChange={(e) => setActTitle(e.target.value)}
              placeholder="ej: Diseña un fondo de emergencias ficticio"
              className="w-full bg-white/5 border border-white/10 light:bg-white light:border-neutral-300 rounded-xl px-4 py-2.5 text-white light:text-neutral-800 placeholder-gray-500 light:placeholder-neutral-400 text-sm focus:outline-none focus:border-violet-500"
            />
          </div>

          {/* Activity Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-400 light:text-neutral-500 uppercase tracking-wider block">
              Descripción detallada de la consigna
            </label>
            <textarea
              value={actDesc}
              onChange={(e) => setActDesc(e.target.value)}
              placeholder="¿Qué consigna resolverá el estudiante para entregar esta semana?"
              className="w-full min-h-[90px] bg-white/5 border border-white/10 light:bg-white light:border-neutral-300 rounded-xl p-4 text-white light:text-neutral-800 placeholder-gray-500 light:placeholder-neutral-400 text-sm focus:outline-none focus:border-violet-500"
            />
          </div>

          {/* Deadline */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-400 light:text-neutral-500 uppercase tracking-wider block">
              Fecha límite de entrega (Deadline)
            </label>
            <input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full bg-white/5 border border-white/10 light:bg-white light:border-neutral-300 rounded-xl px-4 py-2.5 text-white light:text-neutral-800 text-sm focus:outline-none focus:border-violet-500"
            />
          </div>
        </form>

        {/* Footer actions of modal */}
        <div className="bg-white/2 light:bg-neutral-50 border-t border-gray-850 light:border-neutral-200 p-6 flex justify-between items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setIsPreviewOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-gray-300 hover:text-white border border-white/10 hover:border-white/20 light:bg-neutral-100 light:hover:bg-neutral-200 light:text-neutral-700 light:hover:text-neutral-900 light:border-neutral-200 rounded-xl text-sm font-semibold transition-colors cursor-pointer mr-auto"
          >
            <Eye className="w-4 h-4 text-violet-400 light:text-violet-600" />
            <span>Vista previa</span>
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-white/5 light:bg-neutral-100 hover:bg-white/10 light:hover:bg-neutral-200 text-gray-300 light:text-neutral-700 hover:text-white light:hover:text-neutral-900 rounded-xl text-sm font-semibold transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleDirectPublishClick}
              className="px-5 py-2.5 bg-violet-900/40 border border-violet-500/35 hover:bg-violet-900/60 light:bg-violet-50 light:border-violet-200 text-violet-400 hover:text-white light:text-violet-600 light:hover:bg-violet-100/80 rounded-xl text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Clock className="w-4 h-4 shrink-0 animate-pulse" />
              <span>Subir ahora</span>
            </button>
            <button
              onClick={handleSubmit}
              className="liquid-glass-btn flex items-center gap-2 px-6 py-2.5 text-sm font-bold"
            >
              <Save className="w-4 h-4 shrink-0" />
              <span>Guardar clase</span>
            </button>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {isPreviewOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-120 bg-[#070714] light:bg-white flex flex-col justify-start overflow-y-auto no-scrollbar p-6 sm:p-12"
          >
            {/* Banner/Header of Preview */}
            <div className="max-w-4xl w-full mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 light:border-neutral-200 pb-5 mb-8">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsPreviewOpen(false)}
                  className="flex items-center gap-1.5 group text-gray-400 hover:text-white light:text-neutral-500 light:hover:text-neutral-800 text-xs font-semibold transition-colors cursor-pointer bg-white/5 light:bg-neutral-100 px-3 py-1.5 rounded-lg border border-white/5 light:border-neutral-200"
                >
                  <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
                  <span>Volver a Editar</span>
                </button>
                <div className="flex items-center gap-2 px-3 py-1 bg-violet-500/10 border border-violet-500/30 rounded-full animate-pulse">
                  <span className="w-1.5 h-1.5 bg-violet-400 rounded-full" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-violet-400 font-mono">Modo Vista Previa</span>
                </div>
              </div>
              <span className="text-xs text-gray-400 light:text-neutral-500 font-medium italic">
                Así es exactamente como los alumnos visualizarán la clase.
              </span>
            </div>

            {/* Simulated ClassView Container */}
            <div className="max-w-4xl w-full mx-auto">
              {/* Class Header */}
              <div className="mb-8 border-b border-white/5 light:border-neutral-200 pb-5">
                <span className="text-[9px] font-bold uppercase tracking-widest text-violet-400 light:text-violet-600 font-mono">
                  Semana {week || 1} · Nivel {level}
                </span>
                <h1 className="font-sans text-xl sm:text-2xl font-semibold tracking-tight text-white light:text-neutral-950 mt-1">
                  {title || 'Nueva clase sin título'}
                </h1>
              </div>

              {/* Tabs Navigation (Exact replica of ClassView) */}
              <div className="flex bg-[#14132b]/40 light:bg-neutral-100/80 backdrop-blur-xl p-1 rounded-2xl border border-white/5 light:border-neutral-200 mb-8 overflow-x-auto no-scrollbar scroll-smooth self-start max-w-max relative z-10 shadow-lg gap-1">
                {(
                  [
                    { id: 'content', label: 'Contenido' },
                    { id: 'video', label: 'Video' },
                    { id: 'slides', label: 'Diapositivas' },
                    { id: 'activity', label: 'Actividad' },
                  ] as const
                ).map((tab) => {
                  const isActive = previewTab === tab.id;

                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setPreviewTab(tab.id)}
                      className={`relative flex items-center px-4.5 py-2.5 text-xs font-bold rounded-xl whitespace-nowrap transition-all duration-300 cursor-pointer ${
                        isActive
                          ? 'text-white'
                          : 'text-gray-400 light:text-neutral-550 hover:text-gray-200 light:hover:text-neutral-800'
                      }`}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="activePreviewTabPill"
                          className="absolute inset-0 bg-gradient-to-r from-violet-600 to-indigo-600 shadow-lg shadow-violet-950/40 rounded-xl -z-10"
                          transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        />
                      )}
                      <span className="relative z-10">{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Tab views with transitions */}
              <div className="min-h-[300px]">
                {previewTab === 'content' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="prose prose-invert light:prose-neutral max-w-none text-gray-300 light:text-neutral-800 leading-relaxed space-y-4"
                  >
                    <div 
                      className="class-body-html"
                      dangerouslySetInnerHTML={{ 
                        __html: (() => {
                          let htmlText = text.trim();
                          if (htmlText) {
                            htmlText = htmlText.replace(/### (.*?)\n/g, '<h3>$1</h3>');
                            htmlText = htmlText.replace(/\* (.*?)\n/g, '<li>$1</li>');
                            htmlText = htmlText
                              .split('\n\n')
                              .map((p) => {
                                if (p.startsWith('<h3>') || p.startsWith('<li>')) return p;
                                if (p.includes('<li>')) return `<ul>${p}</ul>`;
                                return `<p>${p.replace(/\n/g, '<br>')}</p>`;
                              })
                              .join('');
                          }
                          return htmlText || `<p>${text || 'No hay texto redactado todavía.'}</p>`;
                        })()
                      }}
                    />
                  </motion.div>
                )}

                {previewTab === 'video' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="w-full"
                  >
                    {videoId.trim() ? (
                      <div className="relative aspect-video rounded-2xl border border-white/5 light:border-neutral-200 overflow-hidden bg-black/40 light:bg-neutral-50">
                        <iframe
                          title="Youtube embed code"
                          src={`https://www.youtube.com/embed/${extractYoutubeId(videoId.trim())}`}
                          allowFullScreen
                          className="absolute top-0 left-0 w-full h-full border-0"
                        />
                      </div>
                    ) : (
                      <div className="aspect-video rounded-2xl border border-white/5 light:border-neutral-200/80 flex flex-col items-center justify-center text-center p-6 bg-neutral-950/40 light:bg-neutral-50">
                        <div className="w-10 h-10 rounded-xl bg-violet-600/10 flex items-center justify-center text-violet-400 light:text-violet-600 mb-3 animate-pulse">
                          <Video className="w-4 h-4" />
                        </div>
                        <h3 className="font-sans font-semibold text-white light:text-neutral-800 text-sm mb-1">
                          Video en producción o no ingresado
                        </h3>
                        <p className="text-gray-500 light:text-neutral-500 text-xs max-w-xs">
                          Al vincular un link correcto de YouTube, acá se visualizará el video de la clase.
                        </p>
                      </div>
                    )}
                  </motion.div>
                )}

                {previewTab === 'slides' && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="w-full"
                  >
                    {slidesUrl.trim() ? (
                      <div className="rounded-2xl border border-white/5 light:border-neutral-300 overflow-hidden bg-[#070714] light:bg-[#fbfbfb] shadow-xl relative">
                        <iframe
                          title="Presentación de la clase"
                          src={getEmbedUrl(slidesUrl)}
                          className="w-full h-[320px] sm:h-[480px] border-0"
                          allow="fullscreen"
                          allowFullScreen
                        />
                      </div>
                    ) : (
                      <div className="h-[300px] rounded-2xl border border-white/5 light:border-neutral-200/80 flex flex-col items-center justify-center text-center p-6 bg-neutral-950/40 light:bg-neutral-50">
                        <div className="w-10 h-10 rounded-xl bg-indigo-600/10 flex items-center justify-center text-indigo-400 light:text-indigo-600 mb-3">
                          <Presentation className="w-4 h-4" />
                        </div>
                        <h3 className="font-sans font-semibold text-white light:text-neutral-800 text-sm mb-1">
                          No vinculaste diapositivas todavía
                        </h3>
                        <p className="text-gray-500 light:text-neutral-500 text-xs max-w-xs">
                          Al pegar el código iframe de Gamma, acá se cargará de forma interactiva y responsiva.
                        </p>
                      </div>
                    )}
                  </motion.div>
                )}

                {previewTab === 'activity' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-violet-950/10 border border-violet-900/40 light:bg-violet-50/40 light:border-violet-200/60 rounded-3xl p-6 sm:p-8"
                  >
                    <span className="text-[10px] uppercase font-bold tracking-widest text-[#818cf8]">
                      Entrega Obligatoria semanal
                    </span>
                    <h3 className="font-display text-lg sm:text-xl font-bold text-white light:text-neutral-900 mt-1 mb-3">
                      {actTitle || 'Actividad práctica (Sin título redactado)'}
                    </h3>
                    <p className="text-gray-400 light:text-neutral-700 text-sm leading-relaxed mb-6">
                      {actDesc || 'Acá aparecerá la consigna de la actividad para que el alumno la resuelva.'}
                    </p>

                    {/* Deadline simulated badge */}
                    {deadline && (
                      <div className="flex items-center gap-2 text-xs font-semibold p-3.5 rounded-xl border bg-yellow-950/14 border-yellow-500/25 text-yellow-300 light:bg-amber-50 light:border-amber-200/70 light:text-amber-800 mb-6">
                        <CalendarDays className="w-4 h-4 shrink-0" />
                        <span>Plazo de entrega válido hasta: {(() => {
                          const d = new Date(deadline);
                          return d.toLocaleDateString('es-AR', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          });
                        })()}</span>
                      </div>
                    )}

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs text-gray-400 light:text-neutral-500 font-bold uppercase tracking-wider block">
                          Tu respuesta o conclusión (Simulador de entrega)
                        </label>
                        <textarea
                          placeholder="Escribe tu respuesta aquí para probar el textarea..."
                          className="w-full min-h-[140px] bg-black/20 border border-white/10 light:bg-white light:border-neutral-300 rounded-2xl p-4 text-white light:text-neutral-800 placeholder-gray-500 light:placeholder-neutral-400 font-sans text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors"
                        />
                      </div>

                      <div className="flex justify-end pt-2">
                        <button
                          type="button"
                          className="liquid-glass-btn py-3 px-6 text-sm font-bold opacity-60 cursor-not-allowed select-none"
                        >
                          Entregar actividad (Simulado)
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
