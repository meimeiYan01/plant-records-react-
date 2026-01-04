import { useEffect, useMemo, useState, useRef } from "react";
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
  AddWebsiteModal,
  EditWebsiteModal,
  AddPlantVarietyModal,
  EditPlantVarietyModal,
  AddVarietyKnowledgeModal,
  EditVarietyKnowledgeModal,
  SelectVarietyModal,
  DataPanelModal,
  LocationManagerModal,
  CameraModal,
  AlbumModal,
} from "./components/modals";
import { LogsTab, ExpensesTab, HomeTab, SettingsTab, PlantDetailTab, PlantsTab, KnowledgeTab, KnowledgeAtlasTab, PlantVarietyTab, PlantVarietyDetailTab, AlbumTab } from "./components/tabs";
import { loadState, saveState, daysSince, formatDateTime, LS_KEY, EVENT_TYPES, extFromMime, uid } from "./utils";
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
  // 将知识类型为"variety"的数据转换为多肉品种数据
  const convertKnowledgeToVariety = (knowledge) => {
    // 兼容旧数据：将旧类型映射到新类型
    const getNormalizedType = (type) => {
      if (!type) return "variety";
      if (type === "markdown" || type === "document") return "variety";
      if (type === "article" || type === "video" || type === "xiaohongshu" || type === "web") return "care";
      return type;
    };
    
    const normalizedType = getNormalizedType(knowledge.type);
    if (normalizedType !== "variety") return null;

    // 兼容旧数据：coverPhotoKey（单个）转为 coverPhotoKeys（数组）
    const getCoverPhotoKeys = (coverPhotoKey, coverPhotoKeys) => {
      if (coverPhotoKeys && Array.isArray(coverPhotoKeys)) {
        return coverPhotoKeys;
      }
      if (coverPhotoKey) {
        return [coverPhotoKey];
      }
      return [];
    };

    // 尝试从内容中提取科属信息（如果存在）
    const content = knowledge.content || "";
    let family = "";
    let genus = "";
    let species = "";
    let scientificName = "";

    // 尝试从标题或内容中提取学名（通常用斜体或括号标注）
    const scientificNameMatch = content.match(/([A-Z][a-z]+(?:\s+[a-z]+)+)/) || 
                                knowledge.title?.match(/([A-Z][a-z]+(?:\s+[a-z]+)+)/);
    if (scientificNameMatch) {
      scientificName = scientificNameMatch[1];
    }

    return {
      id: knowledge.id,
      name: knowledge.title || "未命名品种",
      scientificName: scientificName,
      family: family,
      genus: genus,
      species: species,
      description: content,
      coverPhotoKeys: getCoverPhotoKeys(knowledge.coverPhotoKey, knowledge.coverPhotoKeys),
      createdAt: knowledge.createdAt || new Date().toISOString(),
      updatedAt: knowledge.updatedAt || knowledge.createdAt || new Date().toISOString(),
      _fromKnowledge: true, // 标记来源，用于后续处理
    };
  };

  const [state, setState] = useState(() => {
    const loaded = loadState();
    if (loaded) {
      // 兼容旧数据：如果没有新字段，初始化为空数组
      const knowledges = loaded.knowledges || [];
      const existingVarieties = loaded.plantVarieties || [];
      
      // 将知识类型为"variety"的数据转换为多肉品种
      const convertedVarieties = knowledges
        .map(convertKnowledgeToVariety)
        .filter(Boolean); // 过滤掉null值
      
      // 合并现有的多肉品种和转换来的品种，去重（基于ID）
      const allVarietiesMap = new Map();
      [...existingVarieties, ...convertedVarieties].forEach((v) => {
        if (!allVarietiesMap.has(v.id)) {
          allVarietiesMap.set(v.id, v);
        }
      });
      const mergedVarieties = Array.from(allVarietiesMap.values());

      return {
        plants: loaded.plants || [],
        events: loaded.events || [],
        locations: loaded.locations || ["南窗", "东窗", "北窗", "补光灯架"],
        generalLogs: loaded.generalLogs || [],
        expenses: loaded.expenses || [],
        knowledges: knowledges.filter((k) => {
          // 过滤掉类型为"variety"的知识，因为它们已经转换为多肉品种
          const getNormalizedType = (type) => {
            if (!type) return "variety";
            if (type === "markdown" || type === "document") return "variety";
            if (type === "article" || type === "video" || type === "xiaohongshu" || type === "web") return "care";
            return type;
          };
          return getNormalizedType(k.type) !== "variety";
        }),
        knowledgeAtlasWebsites: loaded.knowledgeAtlasWebsites || [],
        plantVarieties: mergedVarieties,
        varietyKnowledges: loaded.varietyKnowledges || {},
        cameraAlbum: loaded.cameraAlbum || [],
      };
    }
    return {
      plants: [],
      events: [],
      locations: ["南窗", "东窗", "北窗", "补光灯架"],
      generalLogs: [],
      expenses: [],
      knowledges: [],
      knowledgeAtlasWebsites: [],
      plantVarieties: [],
      varietyKnowledges: {}, // 每个品种的知识：{ varietyId: [knowledge1, ...] }
      cameraAlbum: [],
    };
  });

  const [currentTab, setCurrentTab] = useState("home"); // home | plants | album | logs | expenses | knowledge | settings
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
  const [showKnowledgeAtlas, setShowKnowledgeAtlas] = useState(false);
  const [showPlantVariety, setShowPlantVariety] = useState(false);
  const [showPlantVarietyDetail, setShowPlantVarietyDetail] = useState(false);
  const [selectedVarietyId, setSelectedVarietyId] = useState(null);
  const [showAddWebsite, setShowAddWebsite] = useState(false);
  const [showEditWebsite, setShowEditWebsite] = useState(null); // website id
  const [showAddPlantVariety, setShowAddPlantVariety] = useState(false);
  const [showEditPlantVariety, setShowEditPlantVariety] = useState(null); // variety id
  const [showSelectVariety, setShowSelectVariety] = useState(false);
  const [showAddVarietyKnowledge, setShowAddVarietyKnowledge] = useState(false);
  const [showEditVarietyKnowledge, setShowEditVarietyKnowledge] = useState(null); // variety knowledge id
  const [showDataPanel, setShowDataPanel] = useState(false);
  const [showLocationManager, setShowLocationManager] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [showAlbum, setShowAlbum] = useState(false);
  const [albumSelectMode, setAlbumSelectMode] = useState(false);
  const [albumSelectCallback, setAlbumSelectCallback] = useState(null);
  const albumSelectCallbackRef = useRef(null);
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
        
        // 兼容旧数据：支持 photoKey 和 photoKeys
        const photoKeys = ev.photoKeys 
          ? (Array.isArray(ev.photoKeys) ? ev.photoKeys : [ev.photoKeys])
          : (ev.photoKey ? [ev.photoKey] : []);
        
        const log = {
          id: `log_event_${ev.id}`,
          type: "daily",
          title: logTitle,
          content: logContent,
          date: ev.at,
          tags: ev.tags || [],
          photos: photoKeys,
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
          // 兼容旧数据：支持 photoKey 和 photoKeys
          const photoKeys = updatedEvent.photoKeys 
            ? (Array.isArray(updatedEvent.photoKeys) ? updatedEvent.photoKeys : [updatedEvent.photoKeys])
            : (updatedEvent.photoKey ? [updatedEvent.photoKey] : []);
          existingLog.photos = photoKeys;
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
      // 兼容旧数据：支持 photoKey 和 photoKeys
      const photoKeys = e.photoKeys 
        ? (Array.isArray(e.photoKeys) ? e.photoKeys : [e.photoKeys])
        : (e.photoKey ? [e.photoKey] : []);
      photoKeys.forEach((key) => {
        if (key) imageKeys.add(key);
      });
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

    // 删除关联的图片（兼容旧数据：支持 photoKey 和 photoKeys）
    const photoKeys = event.photoKeys 
      ? (Array.isArray(event.photoKeys) ? event.photoKeys : [event.photoKeys])
      : (event.photoKey ? [event.photoKey] : []);
    photoKeys.forEach((key) => {
      if (key) removeImageKey(key).catch(() => {});
    });

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

  // 相册管理函数
  function addPhotoToAlbum(imageKey) {
    const photo = {
      id: uid("photo"),
      imageKey,
      createdAt: new Date().toISOString(),
    };
    setState((s) => ({
      ...s,
      cameraAlbum: [photo, ...(s.cameraAlbum || [])],
    }));
  }

  function deletePhotoFromAlbum(photoId) {
    const photo = state.cameraAlbum?.find((p) => p.id === photoId);
    if (photo) {
      // 删除图片
      removeImageKey(photo.imageKey).catch(() => {});
      // 从相册中删除
      setState((s) => ({
        ...s,
        cameraAlbum: (s.cameraAlbum || []).filter((p) => p.id !== photoId),
      }));
    }
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
            photoKeys: log.photos || [], // 使用所有照片
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
            existingEvent.photoKeys = updatedLog.photos || [];
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
              photoKeys: updatedLog.photos || [],
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

  // 知识图鉴网站管理函数
  function addWebsite(website) {
    setState((s) => ({ ...s, knowledgeAtlasWebsites: [website, ...(s.knowledgeAtlasWebsites || [])] }));
  }

  function updateWebsite(updatedWebsite) {
    setState((s) => ({
      ...s,
      knowledgeAtlasWebsites: (s.knowledgeAtlasWebsites || []).map((w) => (w.id === updatedWebsite.id ? updatedWebsite : w)),
    }));
  }

  function deleteWebsite(websiteId) {
    setState((s) => ({
      ...s,
      knowledgeAtlasWebsites: (s.knowledgeAtlasWebsites || []).filter((w) => w.id !== websiteId),
    }));
  }

  // 多肉品种管理函数
  function addPlantVariety(variety) {
    setState((s) => ({ ...s, plantVarieties: [variety, ...(s.plantVarieties || [])] }));
  }

  function updatePlantVariety(updatedVariety) {
    setState((s) => {
      const originalVariety = s.plantVarieties?.find((v) => v.id === updatedVariety.id);
      const isFromKnowledge = originalVariety?._fromKnowledge;

      // 如果这个品种来自知识模块，也要同步更新知识模块
      let newKnowledges = s.knowledges;
      if (isFromKnowledge) {
        // 将更新后的品种数据转换回知识格式
        const updatedKnowledge = {
          id: updatedVariety.id,
          type: "variety",
          title: updatedVariety.name,
          content: updatedVariety.description,
          url: "",
          tags: [],
          coverPhotoKeys: updatedVariety.coverPhotoKeys || [],
          source: "",
          createdAt: updatedVariety.createdAt,
          updatedAt: updatedVariety.updatedAt || new Date().toISOString(),
        };
        newKnowledges = (s.knowledges || []).map((k) => 
          k.id === updatedVariety.id ? updatedKnowledge : k
        );
      }

      return {
        ...s,
        plantVarieties: (s.plantVarieties || []).map((v) => (v.id === updatedVariety.id ? updatedVariety : v)),
        knowledges: newKnowledges,
      };
    });
  }

  function deletePlantVariety(varietyId) {
    const variety = state.plantVarieties?.find((v) => v.id === varietyId);
    if (!variety) return;

    // 删除关联的封面图
    const photoKeys = variety.coverPhotoKeys && Array.isArray(variety.coverPhotoKeys)
      ? variety.coverPhotoKeys
      : (variety.coverPhotoKey ? [variety.coverPhotoKey] : []);
    
    photoKeys.forEach((key) => {
      if (key) removeImageKey(key).catch(() => {});
    });

    setState((s) => {
      // 如果这个品种来自知识模块，也要从知识模块中删除
      const newKnowledges = variety._fromKnowledge
        ? (s.knowledges || []).filter((k) => k.id !== varietyId)
        : s.knowledges;

      return {
        ...s,
        plantVarieties: (s.plantVarieties || []).filter((v) => v.id !== varietyId),
        knowledges: newKnowledges,
      };
    });
  }

  // 品种知识管理函数
  function addVarietyKnowledge(varietyId, knowledge) {
    setState((s) => {
      const currentKnowledges = s.varietyKnowledges?.[varietyId] || [];
      return {
        ...s,
        varietyKnowledges: {
          ...(s.varietyKnowledges || {}),
          [varietyId]: [knowledge, ...currentKnowledges],
        },
      };
    });
  }

  function updateVarietyKnowledge(varietyId, updatedKnowledge) {
    setState((s) => {
      const currentKnowledges = s.varietyKnowledges?.[varietyId] || [];
      return {
        ...s,
        varietyKnowledges: {
          ...(s.varietyKnowledges || {}),
          [varietyId]: currentKnowledges.map((k) => 
            k.id === updatedKnowledge.id ? updatedKnowledge : k
          ),
        },
      };
    });
  }

  function deleteVarietyKnowledge(varietyId, knowledgeId) {
    const knowledge = state.varietyKnowledges?.[varietyId]?.find((k) => k.id === knowledgeId);
    if (!knowledge) return;

    // 删除关联的封面图
    const photoKeys = knowledge.coverPhotoKeys && Array.isArray(knowledge.coverPhotoKeys)
      ? knowledge.coverPhotoKeys
      : (knowledge.coverPhotoKey ? [knowledge.coverPhotoKey] : []);
    
    photoKeys.forEach((key) => {
      if (key) removeImageKey(key).catch(() => {});
    });

    setState((s) => {
      const currentKnowledges = s.varietyKnowledges?.[varietyId] || [];
      return {
        ...s,
        varietyKnowledges: {
          ...(s.varietyKnowledges || {}),
          [varietyId]: currentKnowledges.filter((k) => k.id !== knowledgeId),
        },
      };
    });
  }

  function resetAll() {
    localStorage.removeItem(LS_KEY);
    window.location.reload();
  }

  // 打开图片查看器
  function openImageViewer(images, currentIndex = 0, options = {}) {
    setImageViewer({ images, currentIndex, onViewDetail: options.onViewDetail });
  }

  // 收集时间线中的所有图片用于查看器（兼容旧数据：支持 photoKey 和 photoKeys）
  function getTimelineImages() {
    if (!selectedId) return [];
    const images = [];
    events.forEach((e) => {
      const photoKeys = e.photoKeys 
        ? (Array.isArray(e.photoKeys) ? e.photoKeys : [e.photoKeys])
        : (e.photoKey ? [e.photoKey] : []);
      photoKeys.forEach((key, idx) => {
        if (key) {
          images.push({
            key,
            ext: "jpg", // 将在下载时从 blob.type 获取
            filename: `${e.type}-${formatDateTime(e.at).replace(/[:\s]/g, "-")}-${idx + 1}.jpg`,
          });
        }
      });
    });
    return images;
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
      {currentTab === "home" && (
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
      )}

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
            onOpenCamera={() => setShowCamera(true)}
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

        {currentTab === "plants" && !showPlantDetail && (
          <PlantsTab
            plants={plantsSorted}
            getUrlForKey={getUrlForKey}
            onPlantClick={(id) => {
              setSelectedId(id);
              setShowPlantDetail(true);
              setPlantDetailFromTab("plants");
            }}
            onAddPlant={() => setShowAddPlant(true)}
            onOpenAlbum={() => setCurrentTab("album")}
          />
        )}

        {currentTab === "plants" && showPlantDetail && selectedId && (
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
            onUpdate={updateLog}
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

        {currentTab === "knowledge" && !showKnowledgeAtlas && !showPlantVariety && (
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
            onOpenAtlas={() => setShowKnowledgeAtlas(true)}
            onOpenVariety={() => setShowPlantVariety(true)}
          />
        )}

        {currentTab === "knowledge" && showKnowledgeAtlas && (
          <KnowledgeAtlasTab
            websites={state.knowledgeAtlasWebsites || []}
            onAdd={() => setShowAddWebsite(true)}
            onEdit={(id) => setShowEditWebsite(id)}
            onDelete={(id) =>
              setDeleteConfirm({
                type: "website",
                id,
                name: state.knowledgeAtlasWebsites?.find((w) => w.id === id)?.name || "网站",
              })
            }
            onBack={() => setShowKnowledgeAtlas(false)}
          />
        )}

        {currentTab === "knowledge" && showPlantVariety && !showPlantVarietyDetail && (
          <PlantVarietyTab
            varieties={state.plantVarieties || []}
            getUrlForKey={getUrlForKey}
            onAddKnowledge={() => setShowSelectVariety(true)}
            onEdit={(id) => setShowEditPlantVariety(id)}
            onDelete={(id) =>
              setDeleteConfirm({
                type: "variety",
                id,
                name: state.plantVarieties?.find((v) => v.id === id)?.name || "品种",
              })
            }
            openImageViewer={openImageViewer}
            onBack={() => setShowPlantVariety(false)}
            onVarietyClick={(id) => {
              setSelectedVarietyId(id);
              setShowPlantVarietyDetail(true);
            }}
          />
        )}

        {currentTab === "knowledge" && showPlantVariety && showPlantVarietyDetail && selectedVarietyId && (
          <PlantVarietyDetailTab
            variety={state.plantVarieties?.find((v) => v.id === selectedVarietyId)}
            knowledges={state.varietyKnowledges?.[selectedVarietyId] || []}
            getUrlForKey={getUrlForKey}
            onAdd={() => {
              setShowAddVarietyKnowledge(true);
            }}
            onEdit={(id) => setShowEditVarietyKnowledge(id)}
            onDelete={(id) =>
              setDeleteConfirm({
                type: "varietyKnowledge",
                id,
                varietyId: selectedVarietyId,
                name: state.varietyKnowledges?.[selectedVarietyId]?.find((k) => k.id === id)?.title || "知识",
              })
            }
            openImageViewer={openImageViewer}
            onBack={() => {
              setShowPlantVarietyDetail(false);
              setSelectedVarietyId(null);
            }}
          />
        )}

        {currentTab === "album" && (
          <AlbumTab
            album={state.cameraAlbum || []}
            getUrlForKey={getUrlForKey}
            openImageViewer={openImageViewer}
            onDeletePhoto={deletePhotoFromAlbum}
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
          album={state.cameraAlbum || []}
          getUrlForKey={getUrlForKey}
          onOpenAlbum={(callback) => {
            console.log("[App] onOpenAlbum (Plant) called with callback:", callback);
            setAlbumSelectMode(true);
            setAlbumSelectCallback(callback);
            albumSelectCallbackRef.current = callback; // 同时保存到 ref
            setShowAlbum(true);
          }}
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
          getUrlForKey={getUrlForKey}
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
          album={state.cameraAlbum || []}
          getUrlForKey={getUrlForKey}
          onOpenAlbum={(callback) => {
            console.log("[App] onOpenAlbum (Log) called with callback:", callback);
            setAlbumSelectMode(true);
            setAlbumSelectCallback(callback);
            albumSelectCallbackRef.current = callback; // 同时保存到 ref
            setShowAlbum(true);
          }}
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

      {showAddWebsite && (
        <AddWebsiteModal
          onClose={() => setShowAddWebsite(false)}
          onCreate={(website) => {
            addWebsite(website);
            setShowAddWebsite(false);
          }}
        />
      )}

      {showEditWebsite && (
        <EditWebsiteModal
          website={state.knowledgeAtlasWebsites?.find((w) => w.id === showEditWebsite)}
          onClose={() => setShowEditWebsite(null)}
          onUpdate={(updated) => {
            updateWebsite(updated);
            setShowEditWebsite(null);
          }}
        />
      )}

      {showAddPlantVariety && (
        <AddPlantVarietyModal
          getUrlForKey={getUrlForKey}
          onClose={() => setShowAddPlantVariety(false)}
          onCreate={(variety) => {
            addPlantVariety(variety);
            setShowAddPlantVariety(false);
          }}
        />
      )}

      {showEditPlantVariety && (
        <EditPlantVarietyModal
          variety={state.plantVarieties?.find((v) => v.id === showEditPlantVariety)}
          getUrlForKey={getUrlForKey}
          onClose={() => setShowEditPlantVariety(null)}
          onUpdate={(updated) => {
            updatePlantVariety(updated);
            setShowEditPlantVariety(null);
          }}
        />
      )}

      {showSelectVariety && (
        <SelectVarietyModal
          varieties={state.plantVarieties || []}
          getUrlForKey={getUrlForKey}
          onClose={() => setShowSelectVariety(false)}
          onSelect={(varietyId) => {
            setSelectedVarietyId(varietyId);
            setShowSelectVariety(false);
            setShowAddVarietyKnowledge(true);
          }}
        />
      )}

      {showAddVarietyKnowledge && selectedVarietyId && (
        <AddVarietyKnowledgeModal
          varietyId={selectedVarietyId}
          varietyName={state.plantVarieties?.find((v) => v.id === selectedVarietyId)?.name || "品种"}
          getUrlForKey={getUrlForKey}
          onClose={() => {
            setShowAddVarietyKnowledge(false);
            // 不清空selectedVarietyId，保持在品种详情tab
          }}
          onCreate={(knowledge) => {
            addVarietyKnowledge(selectedVarietyId, knowledge);
            setShowAddVarietyKnowledge(false);
            // 不清空selectedVarietyId，保持在品种详情tab
          }}
        />
      )}

      {showEditVarietyKnowledge && selectedVarietyId && (
        <EditVarietyKnowledgeModal
          knowledge={state.varietyKnowledges?.[selectedVarietyId]?.find((k) => k.id === showEditVarietyKnowledge)}
          varietyName={state.plantVarieties?.find((v) => v.id === selectedVarietyId)?.name || "品种"}
          getUrlForKey={getUrlForKey}
          onClose={() => setShowEditVarietyKnowledge(null)}
          onUpdate={(updated) => {
            updateVarietyKnowledge(selectedVarietyId, updated);
            setShowEditVarietyKnowledge(null);
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
              : deleteConfirm.type === "website"
              ? `确定要删除网站"${deleteConfirm.name}"吗？此操作不可恢复。`
              : deleteConfirm.type === "variety"
              ? `确定要删除品种"${deleteConfirm.name}"吗？此操作不可恢复。`
              : deleteConfirm.type === "varietyKnowledge"
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
            } else if (deleteConfirm.type === "website") {
              deleteWebsite(deleteConfirm.id);
            } else if (deleteConfirm.type === "variety") {
              deletePlantVariety(deleteConfirm.id);
            } else if (deleteConfirm.type === "varietyKnowledge") {
              deleteVarietyKnowledge(deleteConfirm.varietyId, deleteConfirm.id);
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

      {showCamera && (
        <CameraModal
          onClose={() => setShowCamera(false)}
          onCapture={(imageKey) => {
            // 保存到相册
            addPhotoToAlbum(imageKey);
          }}
        />
      )}

      {showAlbum && (
        <AlbumModal
          album={state.cameraAlbum || []}
          getUrlForKey={getUrlForKey}
          openImageViewer={openImageViewer}
          onDeletePhoto={deletePhotoFromAlbum}
          selectMode={albumSelectMode}
          onClose={() => setShowAlbum(false)}
          onSelectPhoto={(imageKeys) => {
            console.log("[App] onSelectPhoto called with:", imageKeys, "albumSelectMode:", albumSelectMode, "hasCallback:", !!albumSelectCallback, "hasRefCallback:", !!albumSelectCallbackRef.current);
            // 使用 ref 来获取最新的回调函数，避免闭包问题
            const callback = albumSelectCallbackRef.current;
            // 只有在选择模式下才处理回调
            if (albumSelectMode && callback) {
              // 调用回调函数，传递选择的图片keys（即使是空数组也要传递，表示取消选择）
              const keys = imageKeys || [];
              console.log("[App] Calling albumSelectCallback with keys:", keys);
              try {
                callback(keys);
              } catch (error) {
                console.error("[App] Error calling albumSelectCallback:", error);
              }
              setAlbumSelectMode(false);
              setAlbumSelectCallback(null);
              albumSelectCallbackRef.current = null; // 同时清空 ref
            } else {
              console.warn("[App] Cannot call callback:", { albumSelectMode, hasCallback: !!callback });
            }
            setShowAlbum(false);
          }}
        />
      )}
          </div>
  );
}
