import React, { useState, useEffect, useMemo, useRef } from 'react';
import './TimeBasedGanttChart.css';

export interface GanttTask {
  id: string;
  n_ordre: string;
  ordre: string;
  ressource: string;
  duree_prevue: number;
  date_debut?: Date | null;
  date_fin?: Date | null;
  statut_matiere: 'pending' | 'ready' | 'missing';
  statut_outil: 'pending' | 'ready' | 'missing';
  statut_of: 'pending' | 'ready' | 'missing';
  date_validation?: Date | null;
  en_retard?: boolean;
  retard_heures?: number;
}

export interface GanttData {
  tasks: GanttTask[];
  machines: string[];
  timeline_hours: number;
}

interface SimpleTimeBasedGanttProps {
  poste: string;
  onTaskClick?: (task: GanttTask) => void;
}

const ROW_HEIGHT = 50;     // machine row height
const TASK_HEIGHT = 30;    // bar height

const SimpleTimeBasedGantt: React.FC<SimpleTimeBasedGanttProps> = ({ poste, onTaskClick }) => {
  const [data, setData] = useState<GanttData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [hoveredTask, setHoveredTask] = useState<string | null>(null);

  // ref to measure real timeline width (if needed later)
  const timelineRef = useRef<HTMLDivElement | null>(null);

  const fetchGanttData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`http://localhost:5000/api/pdim/gantt/${poste}`);
      if (!response.ok) throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      const result = await response.json();

      const transformedTasks: GanttTask[] = (result.tasks || []).map((task: any) => ({
        ...task,
        date_debut: task.date_debut ? new Date(task.date_debut) : null,
        date_fin: task.date_fin ? new Date(task.date_fin) : null,
        date_validation: task.date_validation ? new Date(task.date_validation) : null,
      }));

      setData({
        tasks: transformedTasks,
        machines: (result.machines || []).filter((m: string) => m && m.trim() !== ''),
        timeline_hours: 24,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (poste) fetchGanttData(); }, [poste]);

  // tick every minute
  useEffect(() => {
    const id = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  // base date = today at 00:00
  const baseDate = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, [currentTime]);

  // visible tasks (last 24h & ready)
  const visibleTasks = useMemo(() => {
    if (!data?.tasks) return [];
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 3600 * 1000);
    return data.tasks.filter(t =>
      t.statut_matiere === 'ready' &&
      t.statut_outil === 'ready' &&
      ((t.date_debut && t.date_debut >= twentyFourHoursAgo) ||
       (t.date_validation && t.date_validation >= twentyFourHoursAgo) ||
       (t.date_fin && t.date_fin >= twentyFourHoursAgo))
    );
  }, [data?.tasks]);

  const machines = useMemo(
    () => (data?.machines || []).filter(m => m && m.trim() !== ''),
    [data?.machines]
  );

  // group & order by ordre
  const tasksByMachine = useMemo(() => {
    const grouped: Record<string, GanttTask[]> = {};
    machines.forEach(m => {
      grouped[m] = visibleTasks
        .filter(t => t.ressource === m)
        .sort((a, b) => a.ordre.localeCompare(b.ordre));
    });
    return grouped;
  }, [machines, visibleTasks]);

  // chain tasks per machine
  const chainedTasks = useMemo(() => {
    const chained: Record<string, (GanttTask & { calculatedStartTime: Date; calculatedEndTime: Date })[]> = {};
    Object.keys(tasksByMachine).forEach(machine => {
      const machineTasks = tasksByMachine[machine];
      chained[machine] = [];

      let nextAvailableTime = new Date();
      nextAvailableTime.setHours(8, 0, 0, 0); // base start if no start known

      machineTasks.forEach((task, index) => {
        let start: Date;
        let end: Date;

        if (task.date_debut) {
          start = new Date(task.date_debut);
          end =
            task.statut_of === 'ready' && task.date_validation
              ? new Date(task.date_validation)
              : new Date(start.getTime() + task.duree_prevue * 3600 * 1000);

          if (index > 0) {
            const prev = chained[machine][index - 1];
            if (start < prev.calculatedEndTime) {
              const delay = prev.calculatedEndTime.getTime() - start.getTime();
              start = new Date(prev.calculatedEndTime);
              end = new Date(end.getTime() + delay);
            }
          }
        } else {
          start = index === 0 ? nextAvailableTime : new Date(chained[machine][index - 1].calculatedEndTime);
          end = new Date(start.getTime() + task.duree_prevue * 3600 * 1000);
        }

        nextAvailableTime = new Date(Math.max(nextAvailableTime.getTime(), end.getTime()));

        chained[machine].push({
          ...task,
          calculatedStartTime: start,
          calculatedEndTime: end
        });
      });
    });
    return chained;
  }, [tasksByMachine]);

  // percent helpers
  const hoursFromBase = (d: Date) => (d.getTime() - baseDate.getTime()) / 3600000;
  const toPercent = (hours: number) => `${(hours / 24) * 100}%`;

  const getTaskStyle = (task: GanttTask & { calculatedStartTime: Date; calculatedEndTime: Date }) => {
    const startH = Math.max(0, hoursFromBase(task.calculatedStartTime));
    const endH = Math.max(0, hoursFromBase(task.calculatedEndTime));
    const durationH = Math.max(0.01, endH - startH); // avoid 0 width
    return {
      left: toPercent(startH),
      width: toPercent(durationH),
      position: 'absolute' as const
    };
  };

  const getTaskColor = (t: GanttTask) => {
    if (t.statut_of === 'ready') return t.en_retard ? '#e74c3c' : '#27ae60';
    if (t.statut_of === 'missing') return '#f39c12';
    return '#3498db';
  };

  // container height (no phantom last row)
  const rowsHeight = machines.length * ROW_HEIGHT;

  if (loading) {
    return (
      <div className="simple-gantt-container">
        <div className="gantt-header">
          <h3>Gantt - Poste {poste}</h3>
        </div>
        <div style={{ padding: 24 }}>Chargement des données…</div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="simple-gantt-container">
        <div className="gantt-header">
          <h3>Gantt - Poste {poste}</h3>
          <button onClick={fetchGanttData} className="refresh-button">Actualiser</button>
        </div>
        <div style={{ padding: 24, color: '#e74c3c' }}>Erreur: {error}</div>
      </div>
    );
  }
  if (!data || data.tasks.length === 0) {
    return (
      <div className="simple-gantt-container">
        <div className="gantt-header">
          <h3>Gantt - Poste {poste}</h3>
          <button onClick={fetchGanttData} className="refresh-button">Actualiser</button>
        </div>
        <div style={{ padding: 24 }}>Aucune donnée de planning disponible.</div>
      </div>
    );
  }

  return (
    <div className="simple-gantt-container">
      <div className="gantt-header">
        <h3>Gantt - Poste {poste}</h3>
        <button onClick={fetchGanttData} className="refresh-button" title="Actualiser les données">
          Actualiser
        </button>
      </div>

      <div className="gantt-legend">
        <div className="legend-item"><div className="legend-color" style={{ backgroundColor: '#3498db' }}></div><span>En cours</span></div>
        <div className="legend-item"><div className="legend-color" style={{ backgroundColor: '#27ae60' }}></div><span>Terminé à temps</span></div>
        <div className="legend-item"><div className="legend-color" style={{ backgroundColor: '#e74c3c' }}></div><span>Terminé en retard</span></div>
        <div className="legend-item"><div className="legend-color" style={{ backgroundColor: '#f39c12' }}></div><span>Problème</span></div>
      </div>

      <div className="gantt-content" style={{ height: rowsHeight + 60 }}>
        {/* Machines column */}
        <div className="gantt-machines" style={{ height: rowsHeight + 60 }}>
          <div className="machine-header">Machines / Ordres</div>
          {machines.map(machine => (
            <div key={machine} className="machine-row">
              <span className="machine-label">{machine}</span>
            </div>
          ))}
        </div>

        {/* Timeline side */}
        <div className="gantt-timeline-container" ref={timelineRef}>
          <div className="gantt-timeline-header">
            <div className="date-row">
              {baseDate.toLocaleDateString('fr-FR', { weekday: 'short', month: 'short', day: 'numeric' })}
            </div>
            <div className="hour-row">
              {Array.from({ length: 24 }, (_, i) => (
                <div key={i} className="hour-marker">{i}h</div>
              ))}
            </div>
          </div>

          <div
            className="gantt-tasks-area"
            style={{ height: rowsHeight }}
          >
            {/* row backgrounds */}
            {machines.map((machine, i) => (
              <div
                key={`bg-${machine}`}
                className="machine-row-bg"
                style={{ top: `${i * ROW_HEIGHT}px`, height: `${ROW_HEIGHT}px` }}
              />
            ))}

            {/* current time line — left in % and clamped to [0, 100] */}
            <div
              className="current-time-line"
              style={{
                left: (() => {
                  const h = hoursFromBase(currentTime);
                  const pct = Math.max(0, Math.min(24, h)) / 24 * 100;
                  return `${pct}%`;
                })()
              }}
            >
              <div className="current-time-label">
                {currentTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>

            {/* tasks */}
            {machines.map((machine, machineIndex) =>
              (chainedTasks[machine] || []).map(task => {
                const style = getTaskStyle(task);
                const color = getTaskColor(task);
                const isHovered = hoveredTask === task.id;

                const machineTop = machineIndex * ROW_HEIGHT + 10;

                return (
                  <div
                    key={task.id}
                    className={`gantt-task ${isHovered ? 'hovered' : ''}`}
                    style={{
                      ...style,
                      top: `${machineTop}px`,
                      height: `${TASK_HEIGHT}px`,
                      background: color,
                      border: `1px solid ${color}`,
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0 8px',
                      fontSize: '12px',
                      fontWeight: 500,
                      color: '#fff',
                      cursor: 'pointer',
                      opacity: isHovered ? 1 : 0.9,
                      boxShadow: isHovered ? '0 4px 8px rgba(0,0,0,0.2)' : '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                    onMouseEnter={() => setHoveredTask(task.id)}
                    onMouseLeave={() => setHoveredTask(null)}
                    onClick={() => onTaskClick?.(task)}
                    title={`OF: ${task.n_ordre} | Ordre: ${task.ordre} | ${task.duree_prevue}h prévu${task.en_retard ? ` | Retard: ${task.retard_heures}h` : ''}`}
                  >
                    <span className="task-label">
                      {task.n_ordre}
                      {task.en_retard && <span className="delay-indicator"> ⚠</span>}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* tooltip */}
      {hoveredTask && (
        <div className="gantt-tooltip">
          {(() => {
            const task = visibleTasks.find(t => t.id === hoveredTask);
            if (!task) return null;
            return (
              <div>
                <strong>OF: {task.n_ordre}</strong><br/>
                <strong>Ordre: {task.ordre}</strong><br/>
                <strong>Machine: {task.ressource}</strong><br/>
                <strong>Durée prévue: {task.duree_prevue}h</strong><br/>
                {task.date_debut && <><strong>Début: </strong>{task.date_debut.toLocaleString('fr-FR')}<br/></>}
                {task.date_validation && <><strong>Fin: </strong>{task.date_validation.toLocaleString('fr-FR')}<br/></>}
                {task.en_retard && <><strong>Retard: {task.retard_heures}h</strong><br/></>}
                <strong>Status: </strong>
                {task.statut_of === 'ready' ? 'Terminé' :
                 task.statut_of === 'missing' ? 'Problème' : 'En cours'}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};

export default SimpleTimeBasedGantt;
