import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Save, BookOpen, Film, Layers, FileText, Calendar, Link } from 'lucide-react';
import { ClassItem } from '../types';

interface ClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (classItem: ClassItem) => void;
  initialClass: ClassItem | null;
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

function sanitizeSlidesUrl(input: string): string {
  if (!input) return '';
  let url = input.trim();
  
  // If they pasted an iframe embed code, extract the src attribute
  const iframeMatch = url.match(/src=["'](https:\/\/docs\.google\.com\/presentation\/d\/[a-zA-Z0-9_-]+\/[^"']+)["']/i);
  if (iframeMatch) {
    url = iframeMatch[1];
  }
  
  // Ensure the URL points to /embed and contains the correct presentation prefix
  const idMatch = url.match(/https:\/\/docs\.google\.com\/presentation\/d\/([a-zA-Z0-9_-]+)/);
  if (idMatch) {
    const presentationId = idMatch[1];
    return `https://docs.google.com/presentation/d/${presentationId}/embed`;
  }
  
  return url;
}

export default function ClassModal({
  isOpen,
  onClose,
  onSave,
  initialClass
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

  // Rellenar datos si estamos editando
  useEffect(() => {
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
      // Limpiar formulario para nueva clase
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
  }, [initialClass, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !week) {
      alert('Por favor completa al menos la semana y el título.');
      return;
    }

    const trimmedVideo = videoId.trim();
    if (!trimmedVideo) {
      alert('Por favor ingresa el enlace (link) completo de YouTube.');
      return;
    }

    const isYoutubeUrl = trimmedVideo.includes('youtube.com') || trimmedVideo.includes('youtu.be');
    if (!isYoutubeUrl) {
      alert('Por favor, pega el link completo de YouTube, no solo el ID (ejemplo: https://www.youtube.com/watch?v=dQw4w9WgXcQ).');
      return;
    }

    const extractedId = extractYoutubeId(trimmedVideo);
    if (!extractedId || extractedId === trimmedVideo) {
      alert('No se pudo extraer un ID de video válido de la URL de YouTube ingresada. Asegúrate de que represente un link válido.');
      return;
    }

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

    const classItem: ClassItem = {
      level,
      week: Number(week),
      title: title.trim(),
      unlockAt,
      deadline,
      text: htmlText || `<p>${text}</p>`,
      videoId: extractedId,
      slidesUrl: sanitizeSlidesUrl(slidesUrl),
      actTitle: actTitle.trim(),
      actDesc: actDesc.trim(),
    };

    onSave(classItem);
  };

  if (!isOpen) return null;

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
            <label className="text-xs font-bold text-gray-400 light:text-neutral-500 uppercase tracking-wider block">
              Texto del contenido
            </label>
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
                Embed de Google Slides URL o Código
              </label>
              <input
                type="text"
                value={slidesUrl}
                onChange={(e) => setSlidesUrl(e.target.value)}
                placeholder="https://docs.google.com/presentation/d/.../embed"
                className="w-full bg-white/5 border border-white/10 light:bg-white light:border-neutral-300 rounded-xl px-4 py-2.5 text-white light:text-neutral-800 placeholder-gray-550 light:placeholder-neutral-400 text-xs focus:outline-none focus:border-violet-500"
              />
              <span className="text-[9px] text-[#8e8ea4] light:text-[#717188] italic block">
                Pega el enlace de la presentación o el código iframe completo. Se auto-sanea al guardar.
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
        <div className="bg-white/2 light:bg-neutral-50 border-t border-gray-850 light:border-neutral-200 p-6 flex justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-white/5 light:bg-neutral-100 hover:bg-white/10 light:hover:bg-neutral-200 text-gray-300 light:text-neutral-700 hover:text-white light:hover:text-neutral-900 rounded-xl text-sm font-semibold transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold text-sm rounded-xl cursor-pointer shadow-lg shadow-violet-950/20 light:shadow-violet-600/15 transform active:scale-95 transition-all"
          >
            <Save className="w-4 h-4" />
            <span>Guardar clase</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
