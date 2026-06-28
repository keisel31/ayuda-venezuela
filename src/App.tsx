import { useEffect, useState } from "react";
import {
  Search,
  Heart,
  UserRoundCheck,
  AlertTriangle,
  Camera,
  X,
  Share2,
  Clock,
  MessageCircle,
  Send,
} from "lucide-react";
import { supabase } from "./supabase";
import "./App.css";

type ReportType = "missing" | "found" | "safe";

type PersonReport = {
  id: string;
  type: ReportType;
  name: string | null;
  age: string | null;
  last_seen: string | null;
  contact_phone: string | null;
  photo_url: string | null;
  notes: string | null;
  created_at: string;
};

type ReportComment = {
  id: string;
  report_id: string;
  text: string;
  author: string | null;
  created_at: string;
};

const reportLabels = {
  missing: "Desaparecido",
  found: "Encontrado",
  safe: "A salvo",
};

function App() {
  const [reports, setReports] = useState<PersonReport[]>([]);
  const [type, setType] = useState<ReportType>("missing");
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [lastSeen, setLastSeen] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedReport, setSelectedReport] = useState<PersonReport | null>(
    null
  );

  const [comments, setComments] = useState<ReportComment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [commentAuthor, setCommentAuthor] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const [sendingComment, setSendingComment] = useState(false);

  const loadReports = async () => {
    const { data } = await supabase
      .from("people_reports")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    setReports((data || []) as PersonReport[]);
  };

  const loadComments = async (reportId: string) => {
    setLoadingComments(true);

    const { data, error } = await supabase
      .from("report_comments")
      .select("*")
      .eq("report_id", reportId)
      .order("created_at", { ascending: false });

    if (!error) {
      setComments((data || []) as ReportComment[]);
    }

    setLoadingComments(false);
  };

  useEffect(() => {
    loadReports();
  }, []);

  useEffect(() => {
    if (selectedReport?.id) {
      loadComments(selectedReport.id);
    } else {
      setComments([]);
      setCommentText("");
      setCommentAuthor("");
    }
  }, [selectedReport]);

  const getTimeAgo = (dateString: string) => {
    const diff = new Date().getTime() - new Date(dateString).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return "Hace minutos";
    return hours === 1 ? "Hace 1 hora" : `Hace ${hours} horas`;
  };

  const handleShare = (report: PersonReport) => {
    if (navigator.share) {
      navigator
        .share({
          title: "Ayuda Venezuela - Reporte",
          text: `Busco información sobre: ${
            report.name || "Persona"
          }. Última ubicación: ${report.last_seen || "No especificada"}.`,
          url: window.location.href,
        })
        .catch(console.error);
    }
  };

  const uploadPhoto = async () => {
    if (!photo) return null;
    try {
      const cleanName = photo.name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9.]/g, "-");
      const fileName = `reports/${Date.now()}-${cleanName}`;
      const { error } = await supabase.storage
        .from("photo")
        .upload(fileName, photo);
      if (error) throw error;
      const { data } = supabase.storage.from("photo").getPublicUrl(fileName);
      return data.publicUrl;
    } catch {
      alert("Error subiendo la foto.");
      return null;
    }
  };

  const submitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() && !photo) {
      alert("Agrega nombre o foto");
      return;
    }
    setLoading(true);
    try {
      const photoUrl = await uploadPhoto();
      const { error } = await supabase.from("people_reports").insert({
        type,
        name,
        age,
        last_seen: lastSeen,
        contact_phone: phone,
        notes,
        photo_url: photoUrl,
      });
      if (error) throw error;
      setName("");
      setAge("");
      setLastSeen("");
      setPhone("");
      setNotes("");
      setPhoto(null);
      await loadReports();
    } catch {
      alert("Error al publicar.");
    } finally {
      setLoading(false);
    }
  };

  const submitComment = async () => {
    if (!selectedReport) return;

    if (!commentText.trim()) {
      alert("Escribe una actualización");
      return;
    }

    setSendingComment(true);

    const { error } = await supabase.from("report_comments").insert({
      report_id: selectedReport.id,
      text: commentText.trim(),
      author: commentAuthor.trim() || "Anónimo",
    });

    if (error) {
      alert("No se pudo publicar la actualización");
      setSendingComment(false);
      return;
    }

    setCommentText("");
    setCommentAuthor("");
    await loadComments(selectedReport.id);
    setSendingComment(false);
  };

  const filteredReports = reports.filter((item) => {
    const text =
      `${item.name} ${item.last_seen} ${item.notes} ${item.contact_phone}`.toLowerCase();
    return text.includes(search.toLowerCase());
  });

  return (
    <main className="page">
      <header className="hero">
        <div className="hero-content">
          <h1>Ayuda Venezuela</h1>
          <p>
            Red de localización ciudadana. Busca o reporta el estado de personas
            afectadas.
          </p>
        </div>
      </header>

      <section className="form-container">
        <div className="form-header">
          <h2>Nuevo Reporte</h2>
          <p className="subtitle">Selecciona el estado de la persona</p>
        </div>

        <div className="type-grid">
          <button
            type="button"
            className={`type-btn ${type === "missing" ? "active-missing" : ""}`}
            onClick={() => setType("missing")}
          >
            <AlertTriangle size={18} strokeWidth={2.5} /> Desaparecido
          </button>
          <button
            type="button"
            className={`type-btn ${type === "found" ? "active-found" : ""}`}
            onClick={() => setType("found")}
          >
            <UserRoundCheck size={18} strokeWidth={2.5} /> Encontrado
          </button>
          <button
            type="button"
            className={`type-btn ${type === "safe" ? "active-safe" : ""}`}
            onClick={() => setType("safe")}
          >
            <Heart size={18} strokeWidth={2.5} /> A salvo
          </button>
        </div>

        <form onSubmit={submitReport} className="report-form">
          <div className="form-group row-group">
            <input
              type="text"
              placeholder="Nombre completo o apodo"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field full-width"
            />
            <input
              type="number"
              min="0"
              max="120"
              placeholder="Edad"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className="input-field auto-width"
            />
          </div>
          <div className="form-group">
            <input
              type="text"
              placeholder="Última ubicación conocida o actual"
              value={lastSeen}
              onChange={(e) => setLastSeen(e.target.value)}
              className="input-field"
            />
          </div>
          <div className="form-group">
            <input
              type="tel"
              placeholder="Teléfono de contacto (Ej: +58 414...)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="input-field"
            />
          </div>
          <div className="form-group">
            <textarea
              placeholder="Información adicional (vestimenta, etc)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input-field textarea-field"
            />
          </div>
          <div className="form-actions">
            <label className="upload-wrapper">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setPhoto(e.target.files?.[0] || null)}
                className="hidden-input"
              />
              <div className="upload-button">
                <Camera size={20} />{" "}
                <span className="truncate">
                  {photo ? photo.name : "Adjuntar fotografía"}
                </span>
              </div>
            </label>
            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? "Procesando..." : "Publicar Reporte"}
            </button>
          </div>
        </form>
      </section>

      <section className="search-container premium-search">
        <div className="search-wrapper">
          <Search size={24} className="search-icon" />
          <input
            type="text"
            placeholder="Buscar nombre, ubicación o teléfono..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
          />
        </div>
      </section>

      <section className="reports-grid">
        {filteredReports.map((person) => (
          <article
            className="person-card"
            key={person.id}
            onClick={() => setSelectedReport(person)}
          >
            <div className="card-image-wrapper">
              {person.photo_url ? (
                <img src={person.photo_url} className="card-image" />
              ) : (
                <div className="empty-photo-placeholder">
                  <UserRoundCheck size={48} strokeWidth={1} color="#cbd5e1" />
                </div>
              )}
              <div className={`status-badge ${person.type}`}>
                {reportLabels[person.type]}
              </div>
            </div>
            <div className="card-content">
              <h3 className="person-name">
                {person.name || "Nombre no especificado"}
              </h3>
              <div className="person-details">
                {person.age && (
                  <p className="detail-item">
                    <span>Edad:</span> {person.age} años
                  </p>
                )}
                {person.last_seen && (
                  <p className="detail-item">
                    <span>Ubicación:</span> {person.last_seen}
                  </p>
                )}
                <div className="card-meta">
                  <Clock size={14} /> {getTimeAgo(person.created_at)}
                </div>
              </div>
              <a
                href={`https://wa.me/${person.contact_phone?.replace(
                  /\D/g,
                  ""
                )}`}
                className="contact-btn"
                onClick={(e) => e.stopPropagation()}
              >
                Contactar vía WhatsApp
              </a>
            </div>
          </article>
        ))}
      </section>

      {selectedReport && (
        <div className="modal-overlay" onClick={() => setSelectedReport(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-close"
              onClick={() => setSelectedReport(null)}
            >
              <X size={24} />
            </button>
            <div className="modal-body">
              {selectedReport.photo_url ? (
                <div className="modal-image-container">
                  <img src={selectedReport.photo_url} className="modal-image" />
                </div>
              ) : (
                <div className="modal-empty-photo">
                  <UserRoundCheck size={64} />
                </div>
              )}
              <div className="modal-info">
                <div
                  className={`status-badge modal-badge ${selectedReport.type}`}
                >
                  {reportLabels[selectedReport.type]}
                </div>
                <h2 className="modal-title">{selectedReport.name}</h2>
                <div className="modal-details-list">
                  <div className="modal-detail-row">
                    <span className="modal-label">Edad:</span>{" "}
                    <span className="modal-value">
                      {selectedReport.age} años
                    </span>
                  </div>
                  <div className="modal-detail-row">
                    <span className="modal-label">Ubicación:</span>{" "}
                    <span className="modal-value">
                      {selectedReport.last_seen}
                    </span>
                  </div>
                </div>
                <a
                  href={`https://wa.me/${selectedReport.contact_phone?.replace(
                    /\D/g,
                    ""
                  )}`}
                  className="modal-contact-btn"
                >
                  Contactar vía WhatsApp
                </a>
                <a
                  className="secondary-share-btn"
                  onClick={() => handleShare(selectedReport)}
                >
                  <Share2 size={20} />
                  Compartir
                </a>

                <section className="comments-section">
                  <div className="comments-header">
                    <div>
                      <h3>Actualizaciones</h3>
                      <p>Agrega información útil sobre este caso.</p>
                    </div>

                    <MessageCircle size={22} />
                  </div>

                  <div className="comment-form">
                    <input
                      className="comment-input"
                      placeholder="Tu nombre opcional"
                      value={commentAuthor}
                      onChange={(e) => setCommentAuthor(e.target.value)}
                    />

                    <textarea
                      className="comment-textarea"
                      placeholder="Ej: Fue visto en el Hospital Central / ya fue encontrado / fue trasladado..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                    />

                    <button
                      type="button"
                      className="comment-submit-btn"
                      onClick={submitComment}
                      disabled={sendingComment}
                    >
                      <Send size={18} />
                      {sendingComment
                        ? "Publicando..."
                        : "Publicar actualización"}
                    </button>
                  </div>

                  <div className="comments-list">
                    {loadingComments && (
                      <p className="comments-empty">
                        Cargando actualizaciones...
                      </p>
                    )}

                    {!loadingComments && comments.length === 0 && (
                      <p className="comments-empty">
                        Aún no hay actualizaciones.
                      </p>
                    )}

                    {comments.map((comment) => (
                      <article className="comment-card" key={comment.id}>
                        <div className="comment-top">
                          <strong>{comment.author || "Anónimo"}</strong>
                          <span>{getTimeAgo(comment.created_at)}</span>
                        </div>

                        <p>{comment.text}</p>
                      </article>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default App;