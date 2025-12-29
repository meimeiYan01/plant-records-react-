import { useEffect, useMemo, useState } from "react";
import { usePwaInstall, useImageCache, useTheme } from "./hooks";
import { Badge, Button, ImageFromIdb, ConfirmDialog, ImageViewer, TabBar } from "./components/ui";
import {
  AddPlantModal,
  AddEventModal,
  EditPlantModal,
  EditEventModal,
  AddLogModal,
  EditLogModal,
  AddExpenseModal,
  EditExpenseModal,
  AddKnowledgeModal,
  EditKnowledgeModal,
  DataPanelModal,
  LocationManagerModal,
} from "./components/modals";
import { LogsTab, ExpensesTab, HomeTab, SettingsTab, PlantDetailTab, PlantsTab, KnowledgeTab } from "./components/tabs";
import { loadState, saveState, daysSince, formatDateTime, LS_KEY, EVENT_TYPES, extFromMime } from "./utils";
import { exportBackupZip, importBackupZip } from "./services/backupService";
import { collectLogImageKeys } from "./services/logService";
import { collectExpenseImageKeys } from "./services/expenseService";
import { collectKnowledgeImageKeys } from "./services/knowledgeService";

/**
 * 多肉记录 App · MVP（IndexedDB 照片 + ZIP 备份，可直接打开图片）
 * - 结构数据：localStorage
 * - 照片：IndexedDB（存 Blob，并强制保留 MIME type）
 * - 备份 ZIP：backup.json + images/<key>.<ext> + images-manifest.json
 * - 恢复 ZIP：按 manifest 写回 IndexedDB，key 不变（引用不丢）
 */

export default function App() {
  const [state, setState] = useState(() => {
    const loaded = loadState();
    if (loaded) {
      // 兼容旧数据：如果没有新字段，初始化为空数组
      return {
        plants: loaded.plants || [],
        events: loaded.events || [],
        locations: loaded.locations || ["南窗", "东窗", "北窗", "补光灯架"],
        generalLogs: loaded.generalLogs || [],
        expenses: loaded.expenses || [],
        knowledges: loaded.knowledges || [],
      };
    }
    return {
      plants: [],
      events: [],
      locations: ["南窗", "东窗", "北窗", "补光灯架"],
      generalLogs: [],
      expenses: [],
      knowledges: [],
    };
  });

  const [currentTab, setCurrentTab] = useState("home"); // home | plants | logs | expenses | knowledge | settings
  const [selectedId, setSelectedId] = useState(null);
  const [showPlantDetail, setShowPlantDetail] = useState(false);
  const [plantDetailFromTab, setPlantDetailFromTab] = useState(null); // 记录从哪个标签页进入详情页
  const [showAddPlant, setShowAddPlant] = useState(false);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [showAddLog, setShowAddLog] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showEditPlant, setShowEditPlant] = useState(false);
  const [showEditEvent, setShowEditEvent] = useState(null); // event id
  const [showEditLog, setShowEditLog] = useState(null); // log id
  const [showEditExpense, setShowEditExpense] = useState(null); // expense id
  const [showAddKnowledge, setShowAddKnowledge] = useState(false);
  const [showEditKnowledge, setShowEditKnowledge] = useState(null); // knowledge id
  const [showDataPanel, setShowDataPanel] = useState(false);
  const [showLocationManager, setShowLocationManager] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { type: 'plant'|'event'|'log'|'expense'|'knowledge', id, name }
  const [imageViewer, setImageViewer] = useState(null); // { images: [], currentIndex: 0 }

  // 主题管理
  const { isDark, toggleTheme } = useTheme();

  // PWA 安装提示
  const { deferredPrompt, isStandalone, justInstalled, promptInstall } = usePwaInstall();

  // 图片缓存管理
  const { ensureUrl, getUrlForKey, removeImageKey, clearCache } = useImageCache();

  // 按距离上次浇水天数排序
  const plantsSorted = useMemo(() => {
    return [...state.plants].sort((a, b) => {
      const da = daysSince(a.lastWateredAt);
      const db = daysSince(b.lastWateredAt);
      if (da == null && db == null) return a.name.localeCompare(b.name);
      if (da == null) return 1;
      if (db == null) return -1;
      return db - da;
    });
  }, [state.plants]);

  // 自动保存状态到 localStorage
  useEffect(() => {
    saveState(state);
  }, [state]);

  // 预加载前 12 个封面图
  useEffect(() => {
    const keys = plantsSorted
      .map((p) => p.coverPhotoKey)
      .filter(Boolean)
      .slice(0, 12);
    keys.forEach((k) => ensureUrl(k));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plantsSorted]);

  const selectedPlant = state.plants.find((p) => p.id === selectedId);

  // 获取选中多肉的事件列表（按时间倒序）
  const events = useMemo(() => {
    if (!selectedId) return [];
    return state.events
      .filter((e) => e.plantId === selectedId)
      .sort((a, b) => new Date(b.at) - new Date(a.at));
  }, [state.events, selectedId]);

  // 业务逻辑函数
  function addPlant(plant) {
    setState((s) => ({ ...s, plants: [plant, ...s.plants] }));
  }

  function updatePlant(patch) {
    setState((s) => ({
      ...s,
      plants: s.plants.map((p) => (p.id === patch.id ? { ...p, ...patch } : p)),
    }));
  }

  function addEvent(ev) {
    setState((s) => {
      let plants = s.plants;
      if (ev.type === "water") {
        plants = plants.map((p) => (p.id === ev.plantId ? { ...p, lastWateredAt: ev.at } : p));
      }
      
      const newEvents = [ev, ...s.events];
      const newLogs = [...(s.generalLogs || [])];
      
      // 如果不是来自日志的事件，自动创建对应的日志
      if (ev.type !== "log") {
        const plant = plants.find((p) => p.id === ev.plantId);
        const eventTypeLabel = EVENT_TYPES.find((t) => t.key === ev.type)?.label || ev.type;
        const logTitle = `${plant?.name || "多肉"} - ${eventTypeLabel}`;
        const logContent = ev.note || "";
        
        const log = {
          id: `log_event_${ev.id}`,
          type: "daily",
          title: logTitle,
          content: logContent,
          date: ev.at,
          tags: ev.tags || [],
          photos: ev.photoKey ? [ev.photoKey] : [],
          weather: "",
          mood: "",
          relatedPlants: [ev.plantId],
        };
        
        newLogs.unshift(log);
      }
      
      return { ...s, plants, events: newEvents, generalLogs: newLogs };
    });
  }

  function updateEvent(updatedEvent) {
    setState((s) => {
      let plants = s.plants;
      // 如果修改为浇水事件，更新 lastWateredAt
      if (updatedEvent.type === "water") {
        plants = plants.map((p) =>
          p.id === updatedEvent.plantId ? { ...p, lastWateredAt: updatedEvent.at } : p
        );
      }
      
      const updatedEvents = s.events.map((e) => (e.id === updatedEvent.id ? updatedEvent : e));
      const updatedLogs = [...(s.generalLogs || [])];
      
      // 如果不是来自日志的事件，同步更新对应的日志
      if (updatedEvent.type !== "log") {
        const logId = `log_event_${updatedEvent.id}`;
        const existingLog = updatedLogs.find((l) => l.id === logId);
        const plant = plants.find((p) => p.id === updatedEvent.plantId);
        
        if (existingLog) {
          const eventTypeLabel = EVENT_TYPES.find((t) => t.key === updatedEvent.type)?.label || updatedEvent.type;
          existingLog.title = `${plant?.name || "多肉"} - ${eventTypeLabel}`;
          existingLog.content = updatedEvent.note || "";
          existingLog.date = updatedEvent.at;
          existingLog.tags = updatedEvent.tags || [];
          existingLog.photos = updatedEvent.photoKey ? [updatedEvent.photoKey] : [];
        }
      }
      
      return {
        ...s,
        plants,
        events: updatedEvents,
        generalLogs: updatedLogs,
      };
    });
  }

  function deletePlant(plantId) {
    const plant = state.plants.find((p) => p.id === plantId);
    if (!plant) return;

    // 收集所有需要删除的图片 key
    const imageKeys = new Set();
    if (plant.coverPhotoKey) imageKeys.add(plant.coverPhotoKey);

    // 删除关联的事件和图片
    const relatedEvents = state.events.filter((e) => e.plantId === plantId);
    relatedEvents.forEach((e) => {
      if (e.photoKey) imageKeys.add(e.photoKey);
    });

    // 删除图片
    imageKeys.forEach((key) => removeImageKey(key).catch(() => {}));

    // 删除多肉和关联事件
    setState((s) => ({
      ...s,
      plants: s.plants.filter((p) => p.id !== plantId),
      events: s.events.filter((e) => e.plantId !== plantId),
    }));

    // 如果删除的是当前选中的，清空选中
    if (selectedId === plantId) {
      setSelectedId(null);
    }
  }

  function deleteEvent(eventId) {
    const event = state.events.find((e) => e.id === eventId);
    if (!event) return;

    // 删除关联的图片
    if (event.photoKey) {
      removeImageKey(event.photoKey).catch(() => {});
    }

    // 如果不是来自日志的事件，同步删除对应的日志
    const logIdToDelete = event.type !== "log" ? `log_event_${eventId}` : null;

    // 如果删除的是浇水事件，需要更新 lastWateredAt
    if (event.type === "water") {
      const plantEvents = state.events
        .filter((e) => e.plantId === event.plantId && e.type === "water" && e.id !== eventId)
        .sort((a, b) => new Date(b.at) - new Date(a.at));
      const lastWateredAt = plantEvents.length > 0 ? plantEvents[0].at : null;

      setState((s) => ({
        ...s,
        plants: s.plants.map((p) => (p.id === event.plantId ? { ...p, lastWateredAt } : p)),
        events: s.events.filter((e) => e.id !== eventId),
        // 同步删除对应的日志
        generalLogs: logIdToDelete
          ? (s.generalLogs || []).filter((l) => l.id !== logIdToDelete)
          : s.generalLogs,
      }));
    } else {
      setState((s) => ({
        ...s,
        events: s.events.filter((e) => e.id !== eventId),
        // 同步删除对应的日志
        generalLogs: logIdToDelete
          ? (s.generalLogs || []).filter((l) => l.id !== logIdToDelete)
          : s.generalLogs,
      }));
    }
  }

  function updateLocations(newLocations) {
    setState((s) => ({ ...s, locations: newLocations }));
  }

  // 日志管理函数
  function addLog(log) {
    setState((s) => {
      const newLogs = [log, ...(s.generalLogs || [])];
      const newEvents = [...(s.events || [])];
      
      // 如果日志关联了多肉，为每个关联的多肉创建一个事件
      if (log.relatedPlants && log.relatedPlants.length > 0) {
        log.relatedPlants.forEach((plantId) => {
          const event = {
            id: `event_log_${log.id}_${plantId}`,
            plantId,
            type: "log",
            logId: log.id, // 关联的日志ID
            at: log.date,
            tags: log.tags || [],
            note: log.title || log.content || "",
            photoKey: log.photos && log.photos.length > 0 ? log.photos[0] : "", // 使用第一张照片
          };
          newEvents.push(event);
        });
      }
      
      return {
        ...s,
        generalLogs: newLogs,
        events: newEvents,
      };
    });
  }

  function updateLog(updatedLog) {
    setState((s) => {
      const updatedLogs = (s.generalLogs || []).map((l) => (l.id === updatedLog.id ? updatedLog : l));
      const newEvents = [...(s.events || [])];
      
      // 删除旧的事件（type === "log" 且 logId === updatedLog.id）
      const filteredEvents = newEvents.filter((e) => !(e.type === "log" && e.logId === updatedLog.id));
      
      // 如果日志关联了多肉，为每个关联的多肉创建/更新事件
      if (updatedLog.relatedPlants && updatedLog.relatedPlants.length > 0) {
        updatedLog.relatedPlants.forEach((plantId) => {
          const eventId = `event_log_${updatedLog.id}_${plantId}`;
          const existingEvent = filteredEvents.find((e) => e.id === eventId);
          
          if (existingEvent) {
            // 更新现有事件
            existingEvent.at = updatedLog.date;
            existingEvent.tags = updatedLog.tags || [];
            existingEvent.note = updatedLog.title || updatedLog.content || "";
            existingEvent.photoKey = updatedLog.photos && updatedLog.photos.length > 0 ? updatedLog.photos[0] : "";
          } else {
            // 创建新事件
            filteredEvents.push({
              id: eventId,
              plantId,
              type: "log",
              logId: updatedLog.id,
              at: updatedLog.date,
              tags: updatedLog.tags || [],
              note: updatedLog.title || updatedLog.content || "",
              photoKey: updatedLog.photos && updatedLog.photos.length > 0 ? updatedLog.photos[0] : "",
            });
          }
        });
      }
      
      return {
        ...s,
        generalLogs: updatedLogs,
        events: filteredEvents,
      };
    });
  }

  function deleteLog(logId) {
    const log = state.generalLogs?.find((l) => l.id === logId);
    if (!log) return;

    // 删除关联的图片
    if (log.photos && log.photos.length > 0) {
      log.photos.forEach((key) => removeImageKey(key).catch(() => {}));
    }

    setState((s) => ({
      ...s,
      generalLogs: (s.generalLogs || []).filter((l) => l.id !== logId),
      // 同时删除关联的事件（type === "log" 且 logId === logId）
      events: (s.events || []).filter((e) => !(e.type === "log" && e.logId === logId)),
    }));
  }

  // 花费管理函数
  function addExpense(expense) {
    setState((s) => ({ ...s, expenses: [expense, ...(s.expenses || [])] }));
  }

  function updateExpense(updatedExpense) {
    setState((s) => ({
      ...s,
      expenses: (s.expenses || []).map((e) => (e.id === updatedExpense.id ? updatedExpense : e)),
    }));
  }

  function deleteExpense(expenseId) {
    const expense = state.expenses?.find((e) => e.id === expenseId);
    if (!expense) return;

    // 删除关联的图片
    if (expense.photos && expense.photos.length > 0) {
      expense.photos.forEach((key) => removeImageKey(key).catch(() => {}));
    }

    setState((s) => ({
      ...s,
      expenses: (s.expenses || []).filter((e) => e.id !== expenseId),
    }));
  }

  // 知识管理函数
  function addKnowledge(knowledge) {
    setState((s) => ({ ...s, knowledges: [knowledge, ...(s.knowledges || [])] }));
  }

  function updateKnowledge(updatedKnowledge) {
    setState((s) => ({
      ...s,
      knowledges: (s.knowledges || []).map((k) => (k.id === updatedKnowledge.id ? updatedKnowledge : k)),
    }));
  }

  function deleteKnowledge(knowledgeId) {
    const knowledge = state.knowledges?.find((k) => k.id === knowledgeId);
    if (!knowledge) return;

    // 删除关联的封面图（兼容旧数据）
    const photoKeys = knowledge.coverPhotoKeys && Array.isArray(knowledge.coverPhotoKeys)
      ? knowledge.coverPhotoKeys
      : (knowledge.coverPhotoKey ? [knowledge.coverPhotoKey] : []);
    
    photoKeys.forEach((key) => {
      if (key) removeImageKey(key).catch(() => {});
    });

    setState((s) => ({
      ...s,
      knowledges: (s.knowledges || []).filter((k) => k.id !== knowledgeId),
    }));
  }

  function resetAll() {
    localStorage.removeItem(LS_KEY);
    window.location.reload();
  }

  // 打开图片查看器
  function openImageViewer(images, currentIndex = 0, options = {}) {
    setImageViewer({ images, currentIndex, onViewDetail: options.onViewDetail });
  }

  // 收集时间线中的所有图片用于查看器
  function getTimelineImages() {
    if (!selectedId) return [];
    return events
      .filter((e) => e.photoKey)
      .map((e, idx) => ({
        key: e.photoKey,
        ext: "jpg", // 将在下载时从 blob.type 获取
        filename: `${e.type}-${formatDateTime(e.at).replace(/[:\s]/g, "-")}.jpg`,
      }));
  }

  // ZIP 备份处理
  async function handleExportZip() {
    await exportBackupZip(state);
  }

  async function handleImportZip(file) {
    const nextState = await importBackupZip(file);
    setState(nextState);
    clearCache(); // 清理缓存，让图片重新按需加载
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900">
      <header className="sticky top-0 z-10 border-b border-zinc-200 dark:border-zinc-700 bg-white/80 dark:bg-zinc-800/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900">
              🌱
            </div>
            <div>
              <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">多肉记录</div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400">记录你的多肉养殖全流程</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition"
              aria-label={isDark ? "切换到白天模式" : "切换到夜间模式"}
            >
              {isDark ? "☀️" : "🌙"}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl p-4 pb-24 md:pb-4">
        {/* 标签页内容 */}
        {currentTab === "home" && (
          <HomeTab
            plants={plantsSorted}
            logs={state.generalLogs || []}
            getUrlForKey={getUrlForKey}
            onPlantClick={(id) => {
              setSelectedId(id);
              setShowPlantDetail(true);
              setPlantDetailFromTab("home");
              setCurrentTab("plants");
            }}
            onAddPlant={() => setShowAddPlant(true)}
            onAddLog={() => setShowAddLog(true)}
            openImageViewer={openImageViewer}
            onLogClick={(id) => {
              if (id === "all") {
                setCurrentTab("logs");
              } else {
                setShowEditLog(id);
              }
            }}
          />
        )}

        {currentTab === "plants" && (
          showPlantDetail && selectedId ? (
            <PlantDetailTab
              plant={selectedPlant}
              events={events}
              generalLogs={state.generalLogs || []}
              getUrlForKey={getUrlForKey}
              onEdit={() => setShowEditPlant(true)}
              onDelete={() =>
                setDeleteConfirm({
                  type: "plant",
                  id: selectedPlant.id,
                  name: selectedPlant.name,
                })
              }
              onAddEvent={() => setShowAddEvent(true)}
              onEditEvent={(id) => setShowEditEvent(id)}
              onDeleteEvent={(id) =>
                setDeleteConfirm({
                  type: "event",
                  id,
                  name: `${EVENT_TYPES.find((t) => t.key === state.events.find((e) => e.id === id)?.type)?.label || "事件"} - ${formatDateTime(state.events.find((e) => e.id === id)?.at)}`,
                })
              }
              onEditLog={(id) => setShowEditLog(id)}
              openImageViewer={openImageViewer}
              onBack={() => {
                setShowPlantDetail(false);
                setSelectedId(null);
                if (plantDetailFromTab === "home") {
                  setCurrentTab("home");
                } else {
                  // 保持在 plants tab，但退出详情页
                  setShowPlantDetail(false);
                }
                setPlantDetailFromTab(null);
              }}
            />
          ) : (
            <PlantsTab
              plants={plantsSorted}
              getUrlForKey={getUrlForKey}
              onPlantClick={(id) => {
                setSelectedId(id);
                setShowPlantDetail(true);
                setPlantDetailFromTab("plants");
              }}
              onAddPlant={() => setShowAddPlant(true)}
            />
          )
        )}

        {currentTab === "logs" && (
          <LogsTab
            logs={state.generalLogs || []}
            plants={state.plants}
            getUrlForKey={getUrlForKey}
            onAdd={() => setShowAddLog(true)}
            onEdit={(id) => setShowEditLog(id)}
            onDelete={(id) =>
              setDeleteConfirm({
                type: "log",
                id,
                name: state.generalLogs?.find((l) => l.id === id)?.title || "日志",
              })
            }
            openImageViewer={openImageViewer}
          />
        )}

        {currentTab === "expenses" && (
          <ExpensesTab
            expenses={state.expenses || []}
            plants={state.plants}
            getUrlForKey={getUrlForKey}
            onAdd={() => setShowAddExpense(true)}
            onEdit={(id) => setShowEditExpense(id)}
            onDelete={(id) =>
              setDeleteConfirm({
                type: "expense",
                id,
                name: state.expenses?.find((e) => e.id === id)?.category || "花费",
              })
            }
            openImageViewer={openImageViewer}
          />
        )}

        {currentTab === "knowledge" && (
          <KnowledgeTab
            knowledges={state.knowledges || []}
            getUrlForKey={getUrlForKey}
            onAdd={() => setShowAddKnowledge(true)}
            onEdit={(id) => setShowEditKnowledge(id)}
            onDelete={(id) =>
              setDeleteConfirm({
                type: "knowledge",
                id,
                name: state.knowledges?.find((k) => k.id === id)?.title || "知识",
              })
            }
            openImageViewer={openImageViewer}
          />
        )}

        {currentTab === "settings" && (
          <SettingsTab
            onLocationManager={() => setShowLocationManager(true)}
            onDataPanel={() => setShowDataPanel(true)}
            onAddPlant={() => setShowAddPlant(true)}
            plantsCount={state.plants.length}
            logsCount={state.generalLogs?.length || 0}
            expensesCount={state.expenses?.length || 0}
            knowledgesCount={state.knowledges?.length || 0}
            justInstalled={justInstalled}
            isStandalone={isStandalone}
            deferredPrompt={deferredPrompt}
            promptInstall={promptInstall}
            isDark={isDark}
            toggleTheme={toggleTheme}
          />
        )}
      </main>

      {/* 底部导航栏（移动端） */}
      <TabBar currentTab={currentTab} onTabChange={setCurrentTab} />

      {/* 弹窗组件 */}
      {showAddPlant && (
        <AddPlantModal
          locations={state.locations}
          onClose={() => setShowAddPlant(false)}
          onCreate={(p) => {
            addPlant(p);
            setSelectedId(p.id);
            setShowAddPlant(false);
          }}
        />
      )}

      {showAddEvent && selectedPlant && (
        <AddEventModal
          plant={selectedPlant}
          onClose={() => setShowAddEvent(false)}
          onCreate={(e) => {
            addEvent(e);
            setShowAddEvent(false);
          }}
        />
      )}

      {showEditPlant && selectedPlant && (
        <EditPlantModal
          plant={selectedPlant}
          locations={state.locations}
          getUrlForKey={getUrlForKey}
          onClose={() => setShowEditPlant(false)}
          onUpdate={(updated) => {
            updatePlant(updated);
            setShowEditPlant(false);
          }}
        />
      )}

      {showEditEvent && selectedPlant && (
        <EditEventModal
          event={state.events.find((e) => e.id === showEditEvent)}
          plant={selectedPlant}
          getUrlForKey={getUrlForKey}
          onClose={() => setShowEditEvent(null)}
          onUpdate={(updated) => {
            updateEvent(updated);
            setShowEditEvent(null);
          }}
        />
      )}

      {showLocationManager && (
        <LocationManagerModal
          locations={state.locations}
          plants={state.plants}
          onClose={() => setShowLocationManager(false)}
          onUpdate={updateLocations}
        />
      )}

      {showDataPanel && (
        <DataPanelModal
          state={state}
          onClose={() => setShowDataPanel(false)}
          onImport={(next) => {
            setState(next);
            setShowDataPanel(false);
          }}
          onReset={resetAll}
          onExportZip={handleExportZip}
          onImportZip={handleImportZip}
        />
      )}

      {showAddLog && (
        <AddLogModal
          plants={state.plants}
          getUrlForKey={getUrlForKey}
          onClose={() => setShowAddLog(false)}
          onCreate={(log) => {
            addLog(log);
            setShowAddLog(false);
          }}
        />
      )}

      {showEditLog && (
        <EditLogModal
          log={state.generalLogs?.find((l) => l.id === showEditLog)}
          plants={state.plants}
          getUrlForKey={getUrlForKey}
          onClose={() => setShowEditLog(null)}
          onUpdate={(updated) => {
            updateLog(updated);
            setShowEditLog(null);
          }}
        />
      )}

      {showAddExpense && (
        <AddExpenseModal
          plants={state.plants}
          getUrlForKey={getUrlForKey}
          onClose={() => setShowAddExpense(false)}
          onCreate={(expense) => {
            addExpense(expense);
            setShowAddExpense(false);
          }}
        />
      )}

      {showEditExpense && (
        <EditExpenseModal
          expense={state.expenses?.find((e) => e.id === showEditExpense)}
          plants={state.plants}
          getUrlForKey={getUrlForKey}
          onClose={() => setShowEditExpense(null)}
          onUpdate={(updated) => {
            updateExpense(updated);
            setShowEditExpense(null);
          }}
        />
      )}

      {showAddKnowledge && (
        <AddKnowledgeModal
          getUrlForKey={getUrlForKey}
          onClose={() => setShowAddKnowledge(false)}
          onCreate={(knowledge) => {
            addKnowledge(knowledge);
            setShowAddKnowledge(false);
          }}
        />
      )}

      {showEditKnowledge && (
        <EditKnowledgeModal
          knowledge={state.knowledges?.find((k) => k.id === showEditKnowledge)}
          getUrlForKey={getUrlForKey}
          onClose={() => setShowEditKnowledge(null)}
          onUpdate={(updated) => {
            updateKnowledge(updated);
            setShowEditKnowledge(null);
          }}
        />
      )}

      {deleteConfirm && (
        <ConfirmDialog
          title="确认删除"
          message={
            deleteConfirm.type === "plant"
              ? `确定要删除多肉"${deleteConfirm.name}"吗？这将同时删除所有相关的事件和图片，此操作不可恢复。`
              : deleteConfirm.type === "event"
              ? `确定要删除事件"${deleteConfirm.name}"吗？此操作不可恢复。`
              : deleteConfirm.type === "log"
              ? `确定要删除日志"${deleteConfirm.name}"吗？此操作不可恢复。`
              : deleteConfirm.type === "expense"
              ? `确定要删除花费记录"${deleteConfirm.name}"吗？此操作不可恢复。`
              : deleteConfirm.type === "knowledge"
              ? `确定要删除知识"${deleteConfirm.name}"吗？此操作不可恢复。`
              : `确定要删除吗？此操作不可恢复。`
          }
          confirmText="删除"
          cancelText="取消"
          onConfirm={() => {
            if (deleteConfirm.type === "plant") {
              deletePlant(deleteConfirm.id);
            } else if (deleteConfirm.type === "event") {
              deleteEvent(deleteConfirm.id);
            } else if (deleteConfirm.type === "log") {
              deleteLog(deleteConfirm.id);
            } else if (deleteConfirm.type === "expense") {
              deleteExpense(deleteConfirm.id);
            } else if (deleteConfirm.type === "knowledge") {
              deleteKnowledge(deleteConfirm.id);
            }
            setDeleteConfirm(null);
          }}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}

      {imageViewer && (
        <ImageViewer
          images={imageViewer.images}
          currentIndex={imageViewer.currentIndex}
          getUrlForKey={getUrlForKey}
          onClose={() => setImageViewer(null)}
          onViewDetail={imageViewer.onViewDetail}
        />
      )}
          </div>
  );
}
