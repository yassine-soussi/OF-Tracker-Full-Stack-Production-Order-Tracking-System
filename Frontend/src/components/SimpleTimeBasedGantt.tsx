import React, { useState, useEffect, useMemo, useCallback } from 'react';
import './TimeBasedGanttChart.css';

export interface GanttTask {
  id: string;
  n_ordre: string;
  ordre: string;
  ressource: string;
  duree_prevue: number;
  date_debut?: Date;
  date_fin?: Date;
  statut_matiere: 'pending' | 'ready' | 'missing';
  statut_outil: 'pending' | 'ready' | 'missing';
  statut_of: 'pending' | 'ready' | 'missing';
  date_validation?: Date;
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

const SimpleTimeBasedGantt: React.FC<SimpleTimeBasedGanttProps> = ({
  poste,
  onTaskClick
}) => {
  const [data, setData] = useState<GanttData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [hoveredTask, setHoveredTask] = useState<string | null>(null);

  const fetchGanttData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`http://localhost:5000/api/pdim/gantt/${poste}`);
      
      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      // Transform the data to ensure dates are properly parsed
      const transformedTasks: GanttTask[] = result.tasks.map((task: any) => ({
        ...task,
        date_debut: task.date_debut ? new Date(task.date_debut) : null,
        date_fin: task.date_fin ? new Date(task.date_fin) : null,
        date_validation: task.date_validation ? new Date(task.date_validation) : null,
      }));

      const ganttData: GanttData = {
        tasks: transformedTasks,
        machines: result.machines || [],
        timeline_hours: result.timeline_hours || 24,
      };

      setData(ganttData);
    } catch (err) {
      console.error('Erreur lors du chargement des données Gantt:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  // Fetch data when poste changes
  useEffect(() => {
    if (poste) {
      fetchGanttData();
    }
  }, [poste]);

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Filter tasks that should be visible (both matiere and outil validated)
  // Only show OFs that have been started, completed, or signaled in the last 24 hours
  const visibleTasks = useMemo(() => {
    if (!data?.tasks) return [];
    
    // Calculate 24 hours ago
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
    
    return data.tasks.filter(task =>
      // Both matiere and outil must be validated
      task.statut_matiere === 'ready' && task.statut_outil === 'ready' &&
      (
        // OF started (débuté) in the last 24 hours
        (task.date_debut && task.date_debut >= twentyFourHoursAgo) ||
        // OF terminated (clôturé) in the last 24 hours
        (task.date_validation && task.date_validation >= twentyFourHoursAgo) ||
        // OF signaled in the last 24 hours (using date_fin as signaled date)
        (task.date_fin && task.date_fin >= twentyFourHoursAgo)
      )
    );
  }, [data?.tasks]);

  // Group tasks by machine/ressource and organize by ordre sequence
  const tasksByMachine = useMemo(() => {
    if (!data?.machines) return {};
    const grouped: Record<string, GanttTask[]> = {};
    data.machines.forEach(machine => {
      const machineTasks = visibleTasks.filter(task => task.ressource === machine);
      // Sort tasks by ordre to maintain sequential order
      grouped[machine] = machineTasks.sort((a, b) => a.ordre.localeCompare(b.ordre));
    });
    return grouped;
  }, [visibleTasks, data?.machines]);

  // Calculate task positions using real backend timing data with proper ordre sequence
  const chainedTasks = useMemo(() => {
    const chained: Record<string, (GanttTask & { calculatedStartTime: Date; calculatedEndTime: Date })[]> = {};
    
    Object.keys(tasksByMachine).forEach(machine => {
      const machineTasks = tasksByMachine[machine];
      chained[machine] = [];
      
      let nextAvailableTime = new Date();
      nextAvailableTime.setHours(8, 0, 0, 0); // Base start time
      
      machineTasks.forEach((task, index) => {
        let startTime: Date;
        let endTime: Date;
        
        if (task.date_debut) {
          // Task has been started (both matiere and outil validated)
          startTime = new Date(task.date_debut);
          
          if (task.statut_of === 'ready' && task.date_validation) {
            // Task is completed - use actual completion time
            endTime = new Date(task.date_validation);
          } else {
            // Task started but not completed - use planned duration from start
            endTime = new Date(startTime.getTime() + task.duree_prevue * 60 * 60 * 1000);
          }
          
          // Ensure this task doesn't start before the previous one ends (ordre sequence)
          if (index > 0) {
            const previousTask = chained[machine][index - 1];
            if (startTime < previousTask.calculatedEndTime) {
              // Shift this task to start after previous task
              const delay = previousTask.calculatedEndTime.getTime() - startTime.getTime();
              startTime = new Date(previousTask.calculatedEndTime);
              endTime = new Date(endTime.getTime() + delay);
            }
          }
          
        } else {
          // Task not started yet - position after previous task
          if (index === 0) {
            startTime = nextAvailableTime;
          } else {
            const previousTask = chained[machine][index - 1];
            startTime = new Date(previousTask.calculatedEndTime);
          }
          
          // Use planned duration
          endTime = new Date(startTime.getTime() + task.duree_prevue * 60 * 60 * 1000);
        }
        
        // Update next available time for sequence
        nextAvailableTime = new Date(Math.max(nextAvailableTime.getTime(), endTime.getTime()));
        
        chained[machine].push({
          ...task,
          calculatedStartTime: startTime,
          calculatedEndTime: endTime
        });
      });
    });
    
    return chained;
  }, [tasksByMachine]);

  // Calculate base date for timeline (start of current day)
  const baseDate = useMemo(() => {
    const now = new Date();
    const startTime = new Date(now);
    startTime.setHours(0, 0, 0, 0); // Start at midnight of current day
    return startTime;
  }, [currentTime]);

  // Calculate timeline scale (1 hour = 30px) - Fixed 24 hours timeline
  const HOUR_WIDTH = 30; // Reduced from 50px to fit within container
  const TIMELINE_HOURS = 24; // 24h for current day only
  const timelineWidth = TIMELINE_HOURS * HOUR_WIDTH;

  // Generate date and hour markers for fixed 24-hour timeline (current day only)
  const timelineMarkers = useMemo(() => {
    const dateMarkers: Array<{ date: Date; hour: number; position: number }> = [];
    const hourMarkers: Array<{ hour: number; time: number; date: Date; isNewDay: boolean }> = [];
    
    // Generate markers only for the current day (24 hours)
    for (let i = 0; i < TIMELINE_HOURS; i++) {
      const currentDate = new Date(baseDate.getTime() + i * 60 * 60 * 1000);
      hourMarkers.push({
        hour: i,
        time: currentDate.getHours(),
        date: currentDate,
        isNewDay: currentDate.getHours() === 0 && i > 0
      });
    }
    
    // Create date marker for the current day only
    dateMarkers.push({
      date: baseDate,
      hour: 0,
      position: 0
    });
    
    return { hourMarkers, dateMarkers };
  }, [baseDate]);

  // Auto-center current time line on refresh
  const centerCurrentTimeLine = useCallback(() => {
    const timelineContainer = document.querySelector('.gantt-timeline-container') as HTMLElement;
    if (timelineContainer && baseDate) {
      const currentTimePosition = ((currentTime.getTime() - baseDate.getTime()) / (1000 * 60 * 60)) * HOUR_WIDTH;
      const containerWidth = timelineContainer.clientWidth;
      const scrollPosition = Math.max(0, currentTimePosition - containerWidth / 2);
      timelineContainer.scrollLeft = scrollPosition;
    }
  }, [baseDate, currentTime]);

  // Center timeline after data is loaded
  useEffect(() => {
    if (data && !loading && baseDate) {
      setTimeout(() => centerCurrentTimeLine(), 100);
    }
  }, [data, loading, baseDate, currentTime, centerCurrentTimeLine]);

  // Calculate task position and width using chained positions
  const getTaskStyle = (task: GanttTask & { calculatedStartTime: Date; calculatedEndTime: Date }) => {
    const startDate = task.calculatedStartTime;
    const endDate = task.calculatedEndTime;
    
    const hoursFromBase = (startDate.getTime() - baseDate.getTime()) / (1000 * 60 * 60);
    const left = Math.max(0, hoursFromBase * HOUR_WIDTH);
    
    const duration = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
    const width = Math.max(10, duration * HOUR_WIDTH); // Minimum 10px width

    return {
      left: `${left}px`,
      width: `${width}px`,
      position: 'absolute' as const,
    };
  };

  // Get task color based on status
  const getTaskColor = (task: GanttTask) => {
    if (task.statut_of === 'ready') {
      return task.en_retard ? '#ff6b6b' : '#51cf66';
    }
    if (task.statut_of === 'missing') {
      return '#ffd43b';
    }
    return '#74c0fc';
  };

  const renderTask = (task: GanttTask & { calculatedStartTime: Date; calculatedEndTime: Date }, machineIndex: number) => {
    const style = getTaskStyle(task);
    const color = getTaskColor(task);
    const isHovered = hoveredTask === task.id;
    
    // Calculate vertical position: machine row (reduced heights for compactness)
    const taskHeight = 28;
    const machineRowHeight = 50;
    const machineBaseTop = machineIndex * machineRowHeight;
    const taskTop = machineBaseTop + 11; // Center in machine row

    return (
      <div
        key={task.id}
        className={`gantt-task ${isHovered ? 'hovered' : ''}`}
        style={{
          ...style,
          background: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`,
          top: `${taskTop}px`,
          height: `${taskHeight}px`,
          borderRadius: '10px',
          border: `2px solid ${color}`,
          opacity: isHovered ? 1 : 0.9,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          padding: '0 8px',
          fontSize: '11px',
          fontWeight: '600',
          color: '#fff',
          textShadow: '0 1px 2px rgba(0,0,0,0.3)',
          zIndex: isHovered ? 10 : 1,
          boxShadow: isHovered ? '0 8px 24px rgba(0,0,0,0.2)' : '0 4px 12px rgba(0,0,0,0.1)',
          transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
          transition: 'all 0.3s ease',
          backdropFilter: 'blur(10px)'
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
  };

  // Show loading state
  if (loading) {
    return (
      <div className="time-based-gantt-container">
        <div className="gantt-loading">
          Chargement des données Gantt...
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="time-based-gantt-container">
        <div className="gantt-header">
          <h3>Gantt - Poste {poste}</h3>
          <button 
            onClick={fetchGanttData}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Actualiser
          </button>
        </div>
        <div className="p-4 text-center text-red-600">
          <p>Erreur lors du chargement: {error}</p>
          <button 
            onClick={fetchGanttData}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  // Show empty state
  if (!data || data.tasks.length === 0) {
    return (
      <div className="time-based-gantt-container">
        <div className="gantt-header">
          <h3>Gantt - Poste {poste}</h3>
          <button 
            onClick={fetchGanttData}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Actualiser
          </button>
        </div>
        <div className="gantt-empty">
          <div className="gantt-empty-icon">📊</div>
          <div className="gantt-empty-text">Aucune donnée de planning disponible</div>
          <div className="gantt-empty-subtext">Vérifiez que le planning a été importé pour ce poste</div>
        </div>
      </div>
    );
  }

  return (
    <div className="time-based-gantt-container" style={{
      background: 'linear-gradient(135deg, #ef8f0e 0%, #f4a261 100%)',
      borderRadius: '16px',
      padding: '24px',
      boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
      border: '1px solid rgba(255,255,255,0.1)'
    }}>
      <div className="gantt-header" style={{
        background: 'rgba(255,255,255,0.95)',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '20px',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{
            margin: 0,
            background: 'linear-gradient(135deg, #ef8f0e 0%, #e76f51 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontSize: '28px',
            fontWeight: '700',
            letterSpacing: '-0.5px'
          }}>
            Gantt - Poste {poste}
          </h3>
          <button
            onClick={fetchGanttData}
            style={{
              background: 'linear-gradient(135deg, #ef8f0e 0%, #e76f51 100%)',
              border: 'none',
              borderRadius: '10px',
              padding: '12px 16px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              boxShadow: '0 4px 12px rgba(239, 143, 14, 0.3)',
              transition: 'all 0.3s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(239, 143, 14, 0.4)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 143, 14, 0.3)';
            }}
            title="Actualiser les données"
          >
            Actualiser
          </button>
        </div>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '24px',
          marginTop: '16px',
          flexWrap: 'wrap'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(116, 192, 252, 0.1)',
            padding: '8px 16px',
            borderRadius: '20px',
            border: '1px solid rgba(116, 192, 252, 0.3)'
          }}>
            <div style={{
              width: '12px',
              height: '12px',
              backgroundColor: '#74c0fc',
              borderRadius: '50%',
              boxShadow: '0 2px 4px rgba(116, 192, 252, 0.3)'
            }}></div>
            <span style={{ fontSize: '13px', fontWeight: '500', color: '#495057' }}>En cours</span>
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(81, 207, 102, 0.1)',
            padding: '8px 16px',
            borderRadius: '20px',
            border: '1px solid rgba(81, 207, 102, 0.3)'
          }}>
            <div style={{
              width: '12px',
              height: '12px',
              backgroundColor: '#51cf66',
              borderRadius: '50%',
              boxShadow: '0 2px 4px rgba(81, 207, 102, 0.3)'
            }}></div>
            <span style={{ fontSize: '13px', fontWeight: '500', color: '#495057' }}>Terminé à temps</span>
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(255, 107, 107, 0.1)',
            padding: '8px 16px',
            borderRadius: '20px',
            border: '1px solid rgba(255, 107, 107, 0.3)'
          }}>
            <div style={{
              width: '12px',
              height: '12px',
              backgroundColor: '#ff6b6b',
              borderRadius: '50%',
              boxShadow: '0 2px 4px rgba(255, 107, 107, 0.3)'
            }}></div>
            <span style={{ fontSize: '13px', fontWeight: '500', color: '#495057' }}>Terminé en retard</span>
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(255, 212, 59, 0.1)',
            padding: '8px 16px',
            borderRadius: '20px',
            border: '1px solid rgba(255, 212, 59, 0.3)'
          }}>
            <div style={{
              width: '12px',
              height: '12px',
              backgroundColor: '#ffd43b',
              borderRadius: '50%',
              boxShadow: '0 2px 4px rgba(255, 212, 59, 0.3)'
            }}></div>
            <span style={{ fontSize: '13px', fontWeight: '500', color: '#495057' }}>Problème</span>
          </div>
        </div>
      </div>

      <div style={{
        background: 'rgba(255,255,255,0.95)',
        borderRadius: '12px',
        padding: '0',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
        border: '1px solid rgba(255,255,255,0.2)'
      }}>
        <div style={{ display: 'flex' }}>
          {/* Machine labels (Y-axis) */}
          <div style={{
            width: '180px',
            flexShrink: 0,
            background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
            borderRight: '2px solid rgba(239, 143, 14, 0.1)'
          }}>
            <div style={{
              height: '70px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              background: 'linear-gradient(135deg, #ef8f0e 0%, #e76f51 100%)',
              color: 'white',
              fontWeight: '700',
              fontSize: '14px',
              borderBottom: '2px solid rgba(239, 143, 14, 0.2)'
            }}>
              <div>Machines</div>
              <div style={{ fontSize: '10px', opacity: 0.9, fontWeight: '500' }}>/ Ordres</div>
            </div>
            {(data?.machines || []).map((machine, index) => (
              <div
                key={machine}
                style={{
                  height: '50px',
                  display: 'flex',
                  alignItems: 'center',
                  paddingLeft: '16px',
                  borderBottom: '1px solid rgba(0,0,0,0.05)',
                  background: index % 2 === 0 ? 'rgba(255,255,255,0.7)' : 'rgba(248,249,250,0.7)',
                  fontWeight: '600',
                  fontSize: '13px',
                  color: '#495057',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'rgba(239, 143, 14, 0.1)';
                  e.currentTarget.style.transform = 'translateX(4px)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = index % 2 === 0 ? 'rgba(255,255,255,0.7)' : 'rgba(248,249,250,0.7)';
                  e.currentTarget.style.transform = 'translateX(0)';
                }}
              >
                <span>{machine}</span>
              </div>
            ))}
          </div>

          {/* Timeline and tasks */}
          <div className="gantt-timeline-container" style={{ flex: 1, overflowX: 'hidden' }}>
            {/* Timeline header with dates and hours (X-axis) */}
            <div style={{ height: '70px', position: 'sticky', top: 0, zIndex: 20 }}>
              {/* Date row */}
              <div style={{
                position: 'relative',
                height: '35px',
                background: 'linear-gradient(135deg, #ef8f0e 0%, #e76f51 100%)',
                borderBottom: '2px solid rgba(239, 143, 14, 0.2)'
              }}>
                {timelineMarkers.dateMarkers.map((dateMarker, index) => {
                  const nextDateMarker = timelineMarkers.dateMarkers[index + 1];
                  const width = nextDateMarker ? nextDateMarker.position - dateMarker.position : HOUR_WIDTH * 24;
                  
                  return (
                    <div
                      key={dateMarker.date.toDateString()}
                      style={{
                        position: 'absolute',
                        left: `${dateMarker.position}px`,
                        width: `${width}px`,
                        textAlign: 'center',
                        borderLeft: index === 0 ? 'none' : '2px solid rgba(255,255,255,0.3)',
                        fontSize: '12px',
                        fontWeight: '700',
                        padding: '6px 0',
                        color: 'white',
                        textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {dateMarker.date.toLocaleDateString('fr-FR', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </div>
                  );
                })}
              </div>
              
              {/* Hour row */}
              <div style={{
                position: 'relative',
                height: '35px',
                background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                borderBottom: '2px solid rgba(239, 143, 14, 0.1)'
              }}>
                {timelineMarkers.hourMarkers.map(hourMarker => (
                  <div
                    key={`${hourMarker.date.toDateString()}-${hourMarker.time}`}
                    style={{
                      position: 'absolute',
                      left: `${hourMarker.hour * HOUR_WIDTH}px`,
                      width: `${HOUR_WIDTH}px`,
                      textAlign: 'center',
                      borderLeft: hourMarker.isNewDay ? '2px solid rgba(239, 143, 14, 0.3)' : '1px solid rgba(0,0,0,0.1)',
                      fontSize: '11px',
                      fontWeight: '600',
                      padding: '6px 0',
                      color: '#495057',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: hourMarker.time % 2 === 0 ? 'rgba(255,255,255,0.5)' : 'transparent'
                    }}
                  >
                    {hourMarker.time}h
                  </div>
                ))}
              </div>
            </div>

            {/* Task area */}
            <div
              style={{
                position: 'relative',
                width: `${timelineWidth}px`,
                height: `${(data?.machines || []).length * 50}px`,
                background: 'repeating-linear-gradient(90deg, rgba(248,249,250,0.3) 0px, rgba(248,249,250,0.3) 49px, rgba(233,236,239,0.3) 49px, rgba(233,236,239,0.3) 50px)',
              }}
            >
              {/* Machine row backgrounds */}
              {(data?.machines || []).map((machine, index) => (
                <div
                  key={`bg-${machine}`}
                  style={{
                    position: 'absolute',
                    top: `${index * 50}px`,
                    left: 0,
                    right: 0,
                    height: '50px',
                    backgroundColor: index % 2 === 0 ? 'rgba(255,255,255,0.7)' : 'rgba(248,249,250,0.7)',
                    borderBottom: '1px solid rgba(0,0,0,0.05)',
                  }}
                />
              ))}

              {/* Current time indicator */}
              <div
                style={{
                  position: 'absolute',
                  left: `${((currentTime.getTime() - baseDate.getTime()) / (1000 * 60 * 60)) * HOUR_WIDTH}px`,
                  top: 0,
                  bottom: 0,
                  width: '3px',
                  background: 'linear-gradient(180deg, #ff6b6b 0%, #e03131 100%)',
                  zIndex: 100,
                  borderRadius: '2px',
                  boxShadow: '0 0 10px rgba(224, 49, 49, 0.5)'
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: '-30px',
                    left: '-35px',
                    background: 'linear-gradient(135deg, #ff6b6b 0%, #e03131 100%)',
                    color: 'white',
                    padding: '6px 12px',
                    borderRadius: '20px',
                    fontSize: '11px',
                    fontWeight: '600',
                    whiteSpace: 'nowrap',
                    boxShadow: '0 4px 12px rgba(224, 49, 49, 0.3)',
                    border: '2px solid rgba(255,255,255,0.3)'
                  }}
                >
                  {currentTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>

              {/* Render chained tasks */}
              {(data?.machines || []).map((machine, machineIndex) =>
                chainedTasks[machine]?.map((task) =>
                  renderTask(task, machineIndex)
                )
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Task details tooltip */}
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