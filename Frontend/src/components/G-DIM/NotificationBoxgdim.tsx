import { useState, useEffect, useMemo, useCallback } from "react";

type ProblemNotification = {
  id: number;
  poste?: string;
  of_number?: string;
  n_ordre?: string; //  Garde le nom correct ici
  toolName?: string;
  cause: string;
  details: string | null;
  date: Date;
  type_probleme?: "outil" | "matiere" | "of";
};

export default function NotificationBox() {
  const [notifications, setNotifications] = useState<ProblemNotification[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showDetails, setShowDetails] = useState<ProblemNotification | null>(null);

  useEffect(() => {
    fetch(`http://localhost:5000/api/gdim/notifications/all`)
      .then((res) => res.json())
      .then((data) => {
        console.log("Notifications reçues :", data);
        setNotifications(
          data.map((n: any) => ({
            ...n,
            n_ordre: n.n_ordre,
            toolName: n.tool_name,
            type_probleme: n.type_probleme,
            date: new Date(n.date),
          }))
        );
      })
      .catch((err) => {
        console.error("Erreur de chargement des notifications", err);
        setNotifications([]);
      });
  }, []);

  const unreadCount = useMemo(() => notifications.length, [notifications]);

  const onNotificationClick = useCallback(
    (id: number) => {
      const notif = notifications.find((n) => n.id === id);
      if (!notif) return;
      setShowDetails(notif);
      setShowDropdown(false);
    },
    [notifications]
  );

  return (
    <div className="relative">
      <div
        onClick={() => setShowDropdown((s) => !s)}
        className="relative cursor-pointer hover:bg-white/10 rounded transition-colors duration-200 p-1"
        tabIndex={0}
        aria-label="Notifications"
        role="button"
        onBlur={() => setShowDropdown(false)}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4 text-white"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8m-18 8h18a2 2 0 002-2V8a2 2 0 00-2-2H3a2 2 0 00-2 2v6a2 2 0 002 2z"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </div>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg z-20">
          <div className="py-1">
            <div className="px-4 py-2 text-sm font-medium text-gray-700 border-b bg-gray-50">
              Notifications ({notifications.length})
            </div>
            {notifications.length === 0 ? (
              <div className="px-4 py-4 text-sm text-center text-gray-500">
                Aucune notification trouvée
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className="px-4 py-3 border-b cursor-pointer hover:bg-gray-100"
                    onClick={() => onNotificationClick(n.id)}
                  >
                    <div className="flex justify-between items-start">
                      <span className="text-sm font-medium text-gray-700">
                        {n.type_probleme === "matiere"
                          ? `Problème Matière - ${n.poste} / ${n.n_ordre}`
                          : n.type_probleme === "of"
                          ? `Problème OF - ${n.poste} / ${n.n_ordre}`
                          : `Problème Outils - ${n.poste} / ${n.n_ordre}`}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {n.type_probleme === "matiere"
                        ? `Cause: ${n.cause}`
                        : n.type_probleme === "of"
                        ? `Cause: ${n.cause}`
                        : `${n.toolName} - ${n.cause}`}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {n.date.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {showDetails && (
        <div className="modal-overlay fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="modal-content bg-white p-6 rounded-md w-full max-w-md">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-medium">
                Détails –{" "}
                {showDetails.type_probleme === "matiere"
                  ? `${showDetails.poste} / ${showDetails.n_ordre}`
                  : showDetails.of_number}
              </h3>
              <button
                onClick={() => setShowDetails(null)}
                className="text-gray-400 hover:text-gray-500"
                aria-label="Fermer"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="space-y-4 text-sm">
              {showDetails.type_probleme === "matiere" ? (
                <>
                  <div><strong>Cause :</strong> {showDetails.cause}</div>
                  <div><strong>Détails :</strong> {showDetails.details}</div>
                  <div><strong>Date :</strong> {showDetails.date.toLocaleString()}</div>
                </>
              ) : showDetails.type_probleme === "of" ? (
                <>
                  <div><strong>Ordre :</strong> {showDetails.n_ordre}</div>
                  <div><strong>Cause :</strong> {showDetails.cause}</div>
                  <div><strong>Détails :</strong> {showDetails.details}</div>
                  <div><strong>Date :</strong> {showDetails.date.toLocaleString()}</div>
                </>
              ) : (
                <>
                  <div><strong>Outil :</strong> {showDetails.toolName}</div>
                  <div><strong>Cause :</strong> {showDetails.cause}</div>
                  <div><strong>Détails :</strong> {showDetails.details}</div>
                  <div><strong>Date :</strong> {showDetails.date.toLocaleString()}</div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
