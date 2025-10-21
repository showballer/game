"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import Script from "next/script"
import {
  AlarmClock,
  AlertTriangle,
  Award,
  CheckCircle2,
  Compass,
  Flame,
  Hourglass,
  MonitorSmartphone,
  PhoneCall,
  Shield,
  Sparkles,
  Star,
  Video,
  XCircle,
  Zap,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"

const HOUSE_MODEL_URL = "/api/house-model"

type GameState = "welcome" | "explore" | "final" | "complete"

type ToolId = "smart-glasses" | "safety-manual" | "time-hourglass"

type HazardOption = {
  id: string
  letter: "A" | "B" | "C"
  label: string
  description: string
}

type ToolEffect = {
  toolId: ToolId
  label: string
  description: string
  removeOptionIds?: string[]
  hintText?: string
}

type HazardQuestion = {
  id: string
  prompt: string
  options: HazardOption[]
  correctOptionId: string
  safetyNote: string
  toolEffect?: ToolEffect
}

type CameraOrbit = {
  theta: string
  phi: string
  radius: string
}

type ModelViewerElement = HTMLElement & {
  cameraTarget?: string
  interactionPrompt?: string
  interpolateCameraOrbit?: (
    theta: string,
    phi: string,
    radius: string,
    target: string,
    options?: { duration?: number; easing?: string }
  ) => void
  jumpCameraToGoal?: () => void
}

type Hazard = {
  id: string
  room: string
  title: string
  story: string
  icon: ReactNode
  knowledgeHighlights: string[]
  questions: HazardQuestion[]
  position: string
  normal: string
  cameraTarget: string
  cameraOrbit: CameraOrbit
}

type FinalStep = {
  id: string
  label: string
  action: string
  result: string
}

type FinalScenario = {
  id: string
  title: string
  description: string
  steps: FinalStep[]
  baseTime: number
}

type FeedbackState = {
  type: "correct" | "incorrect"
  message: string
  detail: string
  starsEarned?: number
}

const hazards: Hazard[] = [
  {
    id: "livingroom-electric",
    room: "客厅",
    title: "触电危机",
    story: "角色走到客厅插座附近，插座闪烁着带电火花，提醒你注意用电安全。",
    knowledgeHighlights: [
      "发现电线破损必须立即停止使用并告知家长。",
      "长期把充电器插在插座上存在安全隐患。",
      "使用三孔插头要找转换器并请家长协助。",
    ],
    icon: <Zap className="h-6 w-6 text-sky-600" />,
    questions: [
      {
        id: "damaged-cord",
        prompt: "发现电风扇的电源线破皮裸露了，你应该怎么做？",
        options: [
          {
            id: "tape-over",
            letter: "A",
            label: "用透明胶带缠一下继续用",
            description: "胶带不能隔绝电流，破损电线仍然可能触电。",
          },
          {
            id: "stop-use",
            letter: "B",
            label: "立即停止使用，并告知家长",
            description: "先停用，再请家长或专业人员处理隐患最安全。",
          },
          {
            id: "avoid-touch",
            letter: "C",
            label: "没关系，只要不碰破的地方就安全",
            description: "裸露电线随时可能电击，绝不能继续使用。",
          },
        ],
        correctOptionId: "stop-use",
        safetyNote: "电源线破损要立刻停用并告知家长，避免触电或短路危险。",
        toolEffect: {
          toolId: "smart-glasses",
          label: "启动智慧眼镜",
          description: "智慧眼镜分析后排除了不安全的选项。",
          removeOptionIds: ["tape-over", "avoid-touch"],
        },
      },
      {
        id: "charger-plugged",
        prompt: "手机充电器一直插在插座上不拔，会？",
        options: [
          {
            id: "safe",
            letter: "A",
            label: "非常安全，而且用起来方便",
            description: "一直插着既费电又可能造成短路风险。",
          },
          {
            id: "fire-risk",
            letter: "B",
            label: "存在安全隐患，可能引发火灾",
            description: "长时间通电的电器会发热，积灰后更危险。",
          },
          {
            id: "keep-clean",
            letter: "C",
            label: "能帮助插座保持清洁",
            description: "插着不拔无法起到清洁作用，还可能损坏插座。",
          },
        ],
        correctOptionId: "fire-risk",
        safetyNote: "充电器不用时应拔掉插头，减少短路和火灾隐患。",
        toolEffect: {
          toolId: "smart-glasses",
          label: "启动智慧眼镜",
          description: "智慧眼镜帮你排除了明显不靠谱的选择。",
          removeOptionIds: ["safe", "keep-clean"],
        },
      },
      {
        id: "three-prong",
        prompt: "你想把一个三孔插头插进两孔插座，应该？",
        options: [
          {
            id: "force",
            letter: "A",
            label: "用力硬插进去",
            description: "强行插入会损坏插座，还可能触电。",
          },
          {
            id: "adapter",
            letter: "B",
            label: "找一个转换器，在家长帮助下使用",
            description: "在家长指导下使用转换器，确保安全。",
          },
          {
            id: "break-pin",
            letter: "C",
            label: "把插头上那个多余的“脚”掰断",
            description: "破坏插头会导致漏电，十分危险。",
          },
        ],
        correctOptionId: "adapter",
        safetyNote: "遇到不匹配的插头插座，要在家长帮助下使用转换器，不可硬插或改造插头。",
        toolEffect: {
          toolId: "smart-glasses",
          label: "启动智慧眼镜",
          description: "智慧眼镜提醒你只保留安全的方案。",
          removeOptionIds: ["force", "break-pin"],
        },
      },
    ],
    position: "0.60 0.03 0.41",
    normal: "0 1 0",
    cameraTarget: "0.60m 0.03m 0.41m",
    cameraOrbit: { theta: "35deg", phi: "65deg", radius: "3.8m" },
  },
  {
    id: "kitchen-fire",
    room: "厨房",
    title: "火灾警报",
    story: "你走进厨房，锅具冒出滚滚烟雾，必须快速判断正确的应对方式。",
    knowledgeHighlights: [
      "电器出现异常味道要先断电后处理。",
      "燃气灶软管至少每半年检查一次是否老化。",
      "冰箱储存要生熟分开，防止交叉污染。",
    ],
    icon: <Flame className="h-6 w-6 text-orange-600" />,
    questions: [
      {
        id: "microwave-smoke",
        prompt: "微波炉正在运行，你闻到里面有烧焦的味道，第一步应该？",
        options: [
          {
            id: "open-now",
            letter: "A",
            label: "立刻打开微波炉查看",
            description: "开门会让高温空气冲出，进一步扩大危险。",
          },
          {
            id: "power-off",
            letter: "B",
            label: "立即关闭微波炉电源",
            description: "先断电才能安全检查原因，避免故障加剧。",
          },
          {
            id: "splash-water",
            letter: "C",
            label: "泼一点水到微波炉门上降温",
            description: "泼水可能损坏电器，甚至造成触电。",
          },
        ],
        correctOptionId: "power-off",
        safetyNote: "电器出现故障时要先断电，确保安全后再处理问题。",
        toolEffect: {
          toolId: "safety-manual",
          label: "翻开安全手册",
          description: "翻开安全手册，找到处理电器故障的关键步骤。",
          hintText: "安全手册提示：电器出故障，先断电源是关键！",
        },
      },
      {
        id: "gas-hose",
        prompt: "家用燃气灶的橡胶软管，应该多久检查一次是否老化？",
        options: [
          {
            id: "yearly",
            letter: "A",
            label: "每年",
            description: "一年检查一次可能错过老化隐患。",
          },
          {
            id: "half-year",
            letter: "B",
            label: "每半年",
            description: "半年检查一次，能及时发现并更换老化管线。",
          },
          {
            id: "only-smell",
            letter: "C",
            label: "只有在闻到煤气味时才需要检查",
            description: "闻到煤气味时往往已经很危险，平时就要定期检查。",
          },
        ],
        correctOptionId: "half-year",
        safetyNote: "燃气软管要至少每半年检查一次，提前预防漏气隐患。",
        toolEffect: {
          toolId: "safety-manual",
          label: "翻开安全手册",
          description: "安全手册中记载了燃气管线检查的频率。",
          hintText: "安全手册提示：燃气管线勤检查，预防漏气保平安。",
        },
      },
      {
        id: "food-storage",
        prompt: "冰箱里的生肉和熟食应该怎样存放？",
        options: [
          {
            id: "anywhere",
            letter: "A",
            label: "随便放，冰箱里很干净",
            description: "生肉容易带细菌，混放会污染熟食。",
          },
          {
            id: "separate",
            letter: "B",
            label: "用保鲜盒或保鲜袋分装，生熟分开",
            description: "生熟分开存放，避免细菌交叉感染。",
          },
          {
            id: "same-plate",
            letter: "C",
            label: "放在同一个盘子里，节省空间",
            description: "混放会让细菌污染熟食，存在健康风险。",
          },
        ],
        correctOptionId: "separate",
        safetyNote: "冰箱储存要生熟分开，并使用密封容器保护食物安全。",
        toolEffect: {
          toolId: "safety-manual",
          label: "翻开安全手册",
          description: "安全手册会告诉你生熟食物怎样分区存放。",
          hintText: "安全手册提示：生熟食物是邻居，细菌搬家很容易！",
        },
      },
    ],
    position: "1.28 0.08 0.28",
    normal: "0 1 0",
    cameraTarget: "1.28m 0.08m 0.28m",
    cameraOrbit: { theta: "30deg", phi: "70deg", radius: "4m" },
  },
  {
    id: "study-network",
    room: "书房",
    title: "网络陷阱",
    story: "书房电脑屏幕上突然跳出一个虚假中奖窗口，你需要在网络世界保持警惕。",
    knowledgeHighlights: [
      "不连接陌生的免费 Wi-Fi，可能存在陷阱。",
      "网上陌生人索要家庭信息要拒绝并告诉家长。",
      "账号异地登录要立即修改密码保障安全。",
    ],
    icon: <MonitorSmartphone className="h-6 w-6 text-purple-600" />,
    questions: [
      {
        id: "unknown-wifi",
        prompt: "一个陌生的 Wi-Fi 信号，没有密码，你应该？",
        options: [
          {
            id: "connect-now",
            letter: "A",
            label: "太好了，马上连接",
            description: "陌生网络可能窃取信息或植入病毒。",
          },
          {
            id: "refuse",
            letter: "B",
            label: "绝不连接，可能是陷阱",
            description: "陌生免费网络可能存在安全风险，拒绝连接最安全。",
          },
          {
            id: "connect-limited",
            letter: "C",
            label: "先连接，只要不上网银就行",
            description: "连接后仍可能被窃取账号密码或个人信息。",
          },
        ],
        correctOptionId: "refuse",
        safetyNote: "不随意连接陌生 Wi-Fi，谨防钓鱼和信息泄露。",
        toolEffect: {
          toolId: "smart-glasses",
          label: "启动智慧眼镜",
          description: "智慧眼镜识别出最具迷惑性的选项并将其移除。",
          removeOptionIds: ["connect-limited"],
        },
      },
      {
        id: "ask-address",
        prompt: "在网上认识的新朋友问你家的具体地址，想给你寄礼物，你应该？",
        options: [
          {
            id: "tell-address",
            letter: "A",
            label: "告诉他，因为他是好朋友",
            description: "网上身份无法确认，透露地址极其危险。",
          },
          {
            id: "refuse-and-tell",
            letter: "B",
            label: "拒绝，并立即告诉家长",
            description: "保护隐私并让家长知情，防止潜在危险。",
          },
          {
            id: "tell-community",
            letter: "C",
            label: "只告诉他所在的小区名",
            description: "透露小区等信息仍可能暴露具体位置。",
          },
        ],
        correctOptionId: "refuse-and-tell",
        safetyNote: "遇到陌生人索要隐私要拒绝并告诉家长，不给对方任何线索。",
        toolEffect: {
          toolId: "smart-glasses",
          label: "启动智慧眼镜",
          description: "智慧眼镜帮你识破看似安全的选项。",
          removeOptionIds: ["tell-community"],
        },
      },
      {
        id: "account-kicked",
        prompt: "你的游戏账号突然在别处登录，你被踢下线了，第一步应该做什么？",
        options: [
          {
            id: "login-back",
            letter: "A",
            label: "马上重新登录，把对方挤下去",
            description: "不改密码对方仍能再次登入，风险未除。",
          },
          {
            id: "change-password",
            letter: "B",
            label: "立即修改密码",
            description: "修改密码能切断陌生登录，保护账号安全。",
          },
          {
            id: "complain-online",
            letter: "C",
            label: "发朋友圈骂人",
            description: "发泄情绪解决不了安全问题。",
          },
        ],
        correctOptionId: "change-password",
        safetyNote: "账号异地登录要第一时间修改密码并开启安全验证。",
        toolEffect: {
          toolId: "smart-glasses",
          label: "启动智慧眼镜",
          description: "智慧眼镜留下正确答案，排除了其它干扰选项。",
          removeOptionIds: ["login-back", "complain-online"],
        },
      },
    ],
    position: "0.91 0.08 -0.09",
    normal: "0 1 0",
    cameraTarget: "0.91m 0.08m -0.09m",
    cameraOrbit: { theta: "210deg", phi: "60deg", radius: "3.6m" },
  },
]

const finalScenarios: FinalScenario[] = [
  {
    id: "earthquake",
    title: "地震演练",
    description: "“地震了！请快速完成紧急避险！”",
    baseTime: 45,
    steps: [
      {
        id: "desk",
        label: "书桌",
        action: "点击“书桌”",
        result: "角色躲到书桌下。",
      },
      {
        id: "pillow",
        label: "枕头",
        action: "点击“枕头”",
        result: "角色用枕头护住头部。",
      },
      {
        id: "door",
        label: "房门",
        action: "等待震动停止后，点击“房门”",
        result: "角色安全撤离。",
      },
    ],
  },
  {
    id: "night-fire",
    title: "夜间火警",
    description: "“夜间起火！请摸黑完成逃生准备！”",
    baseTime: 50,
    steps: [
      {
        id: "clothes",
        label: "床边的衣服",
        action: "点击“床边的衣服”",
        result: "角色拿起衣服，保护双手以防烫伤。",
      },
      {
        id: "door",
        label: "房门",
        action: "点击“房门”",
        result: "出现“触摸门把手，发烫！”的提示。",
      },
      {
        id: "window",
        label: "窗口",
        action: "点击“窗口”",
        result: "挂上鲜艳衣物发出求救信号。",
      },
    ],
  },
]

const FINAL_STAGE_STARS = 3
const TOTAL_STARS = hazards.length * 3 + FINAL_STAGE_STARS

export default function HomeSafetyGuardian() {
  const [gameState, setGameState] = useState<GameState>("welcome")
  const [activeHazard, setActiveHazard] = useState<Hazard | null>(null)
  const [activeQuestion, setActiveQuestion] = useState<HazardQuestion | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [feedback, setFeedback] = useState<FeedbackState | null>(null)
  const [attempts, setAttempts] = useState<Record<string, number>>({})
  const [completedHazards, setCompletedHazards] = useState<string[]>([])
  const [activeSafetyNote, setActiveSafetyNote] = useState<string | null>(null)
  const [stars, setStars] = useState(0)
  const [score, setScore] = useState(0)
  const [finalStageCompleted, setFinalStageCompleted] = useState(false)
  const [modelLoaded, setModelLoaded] = useState(false)
  const [hiddenOptionIds, setHiddenOptionIds] = useState<string[]>([])
  const [toolUsed, setToolUsed] = useState(false)
  const [toolMessage, setToolMessage] = useState<string | null>(null)
  const [finalScenario, setFinalScenario] = useState<FinalScenario | null>(null)
  const [finalProgress, setFinalProgress] = useState(0)
  const [finalTimer, setFinalTimer] = useState(0)
  const [finalTimerActive, setFinalTimerActive] = useState(false)
  const [hourglassUsed, setHourglassUsed] = useState(false)
  const [finalFeedback, setFinalFeedback] = useState<string | null>(null)
  const modelViewerRef = useRef<ModelViewerElement | null>(null)

  const focusHazard = (hazard: Hazard) => {
    const viewer = modelViewerRef.current
    if (!viewer) return

    const { cameraOrbit, cameraTarget } = hazard
    if (viewer.interactionPrompt !== undefined) {
      viewer.interactionPrompt = "none"
    }
    viewer.setAttribute("camera-target", cameraTarget)
    viewer.setAttribute(
      "camera-orbit",
      `${cameraOrbit.theta} ${cameraOrbit.phi} ${cameraOrbit.radius}`
    )

    if (viewer.interpolateCameraOrbit) {
      viewer.interpolateCameraOrbit(
        cameraOrbit.theta,
        cameraOrbit.phi,
        cameraOrbit.radius,
        cameraTarget,
        { duration: 1200, easing: "ease-in-out" }
      )
    } else {
      viewer.jumpCameraToGoal?.()
    }
  }

  const progress = useMemo(() => Math.round((stars / TOTAL_STARS) * 100), [stars])

  const visibleOptions = useMemo(() => {
    if (!activeQuestion) return []
    return activeQuestion.options.filter((option) => !hiddenOptionIds.includes(option.id))
  }, [activeQuestion, hiddenOptionIds])

  const openHazard = (hazard: Hazard) => {
    focusHazard(hazard)
    setActiveHazard(hazard)
    const questionIndex = Math.floor(Math.random() * hazard.questions.length)
    const selectedQuestion = hazard.questions[questionIndex]
    setActiveQuestion(selectedQuestion)
    setHiddenOptionIds([])
    setToolUsed(false)
    setToolMessage(null)
    setActiveSafetyNote(null)
    setDialogOpen(true)
    setFeedback(null)
  }

  const handleAnswer = (optionId: string) => {
    if (!activeHazard || !activeQuestion) return

    const previousAttempts = attempts[activeHazard.id] ?? 0
    const nextAttempts = previousAttempts + 1
    const isCorrect = optionId === activeQuestion.correctOptionId

    setAttempts((prev) => ({ ...prev, [activeHazard.id]: nextAttempts }))

    if (isCorrect) {
      const starsEarned = nextAttempts === 1 ? 3 : nextAttempts === 2 ? 2 : 1
      setFeedback({
        type: "correct",
        message: "太棒了！你做出了最安全的选择。",
        detail: `本题获得 ${starsEarned} 颗星星。`,
        starsEarned,
      })
      setActiveSafetyNote(activeQuestion.safetyNote)
      if (!completedHazards.includes(activeHazard.id)) {
        setCompletedHazards((prev) => [...prev, activeHazard.id])
        setStars((prev) => prev + starsEarned)
        setScore((prev) => prev + starsEarned * 50)
      }
    } else {
      setFeedback({
        type: "incorrect",
        message: "再想一想，还有更安全的办法！",
        detail: "提示：先保护好自己，再寻求大人或专业人员的帮助。",
      })
    }
  }

  const handleUseTool = () => {
    if (!activeQuestion?.toolEffect || toolUsed) return

    const effect = activeQuestion.toolEffect
    if (effect.removeOptionIds) {
      setHiddenOptionIds(effect.removeOptionIds)
    }
    setToolUsed(true)
    setToolMessage(effect.hintText ?? effect.description)
  }

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open)
    if (!open) {
      setActiveHazard(null)
      setActiveQuestion(null)
      setFeedback(null)
      setHiddenOptionIds([])
      setToolUsed(false)
      setToolMessage(null)
      setActiveSafetyNote(null)
    }
  }

  const initializeFinalScenario = useCallback(() => {
    const scenarioIndex = Math.floor(Math.random() * finalScenarios.length)
    const scenario = finalScenarios[scenarioIndex]
    setFinalScenario(scenario)
    setFinalProgress(0)
    setFinalTimer(scenario.baseTime)
    setFinalTimerActive(true)
    setHourglassUsed(false)
    setFinalFeedback(null)
  }, [])

  const handleFinalStepClick = (stepId: string) => {
    if (!finalScenario) return

    const expectedStep = finalScenario.steps[finalProgress]
    if (!expectedStep) return

    if (stepId === expectedStep.id) {
      const nextProgress = finalProgress + 1
      setFinalProgress(nextProgress)
      setFinalFeedback(`✅ ${expectedStep.result}`)
      if (nextProgress === finalScenario.steps.length) {
        setFinalTimerActive(false)
        if (!finalStageCompleted) {
          setFinalStageCompleted(true)
          setStars((prev) => prev + FINAL_STAGE_STARS)
          setScore((prev) => prev + FINAL_STAGE_STARS * 50)
        }
        setGameState("complete")
      }
    } else {
      setFinalFeedback("⚠️ 顺序不对，再检查一下提示！")
    }
  }

  const handleUseHourglass = () => {
    if (hourglassUsed || !finalTimerActive) return
    setHourglassUsed(true)
    setFinalTimer((prev) => prev + 15)
    setFinalFeedback("⏳ 时间沙漏启动，额外争取了 15 秒！")
  }

  const handleFinalRetry = () => {
    initializeFinalScenario()
  }

  useEffect(() => {
    if (gameState === "explore" && completedHazards.length === hazards.length) {
      const timer = setTimeout(() => setGameState("final"), 1200)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [completedHazards, gameState])

  useEffect(() => {
    if (gameState === "final") {
      initializeFinalScenario()
    }
  }, [gameState, initializeFinalScenario])

  useEffect(() => {
    if (gameState !== "final" || !finalTimerActive) {
      return undefined
    }

    if (finalTimer <= 0) {
      setFinalTimerActive(false)
      setFinalFeedback("⛔ 时间用完了，再试一次！")
      return undefined
    }

    const countdown = setInterval(() => {
      setFinalTimer((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)

    return () => clearInterval(countdown)
  }, [finalTimerActive, finalTimer, gameState])

  useEffect(() => {
    const viewer = modelViewerRef.current
    if (!viewer) return

    const handleLoad = () => {
      setModelLoaded(true)
    }
    
    const handleProgress = (event: Event & { detail?: { totalProgress?: number } }) => {
      if (event.detail?.totalProgress === 1) {
        setModelLoaded(true)
      }
    }

    const handleModelLoad = () => {
      setModelLoaded(true)
    }

    viewer.addEventListener("load", handleLoad)
    viewer.addEventListener("progress", handleProgress)
    viewer.addEventListener("model-visibility", handleModelLoad)

    // 检查是否已经加载完成 - 增加检查次数和时间间隔
    const checkInterval = setInterval(() => {
      const mvElement = viewer as any
      if (mvElement.loaded || mvElement.modelIsVisible || mvElement.$scene) {
        setModelLoaded(true)
        clearInterval(checkInterval)
      }
    }, 200)

    // 兜底：3秒后强制显示
    const fallbackTimeout = setTimeout(() => {
      setModelLoaded(true)
    }, 3000)

    return () => {
      viewer.removeEventListener("load", handleLoad)
      viewer.removeEventListener("progress", handleProgress)
      viewer.removeEventListener("model-visibility", handleModelLoad)
      clearInterval(checkInterval)
      clearTimeout(fallbackTimeout)
    }
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-purple-50 to-rose-50 pb-16">
      <Script
        type="module"
        src="https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js"
        strategy="afterInteractive"
      />

      <main className="w-full flex flex-col gap-8 p-6">
        <header className="text-center">
          <Badge className="mb-4 rounded-full bg-sky-500 px-4 py-1 text-sm font-semibold text-white">
            创想守护 · 家庭安全小卫士
          </Badge>
          <h1 className="text-4xl font-bold text-slate-900 sm:text-5xl">
            3D 家庭安全守护任务
          </h1>
          <p className="mt-3 text-lg text-slate-600 sm:text-xl">
            在立体房屋中寻找隐患，完成安全挑战，成为家庭的守护者！
          </p>
        </header>

        {gameState === "welcome" && (
          <section className="mx-auto grid max-w-4xl gap-6 md:grid-cols-[1.1fr_0.9fr]">
            <Card className="bg-white/80 backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl text-slate-800">
                  <Shield className="h-7 w-7 text-sky-500" />
                  任务说明
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-slate-600">
                <p>
                  房子里藏着 <strong>{hazards.length}</strong> 个常见的家庭安全场景。点击房屋上的闪光标记，聆听故事并选出最安全的做法。
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <Sparkles className="mt-1 h-5 w-5 text-purple-500" />
                    <span>首次答对可得 3 颗星，第二次 2 颗，第三次 1 颗。星星越多，守护力越强！</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Compass className="mt-1 h-5 w-5 text-sky-500" />
                    <span>拖动、旋转 3D 房子，从不同角度观察室内外的潜在危险。</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <AlertTriangle className="mt-1 h-5 w-5 text-amber-500" />
                    <span>认真阅读安全提示，把知识带回家中与家人分享。</span>
                  </li>
                </ul>
                <div className="rounded-lg bg-sky-50 p-4 text-sm text-sky-700">
                  <p className="font-semibold">操作技巧：</p>
                  <p>鼠标左键旋转，滚轮缩放，按住右键或两指滑动可平移视角。</p>
                </div>
              </CardContent>
            </Card>

            <Card className="flex flex-col justify-between bg-gradient-to-br from-sky-500 to-indigo-500 text-white shadow-xl">
              <CardHeader>
                <CardTitle className="text-2xl">准备成为守护者了吗？</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 text-sky-50">
                <div className="rounded-xl bg-white/15 p-4">
                  <p className="text-sm uppercase tracking-wide text-sky-100">安全装备</p>
                  <ul className="mt-2 space-y-2 text-base">
                    <li className="flex items-center gap-2">
                      <PhoneCall className="h-5 w-5" />记住家长和紧急电话
                    </li>
                    <li className="flex items-center gap-2">
                      <Video className="h-5 w-5" />善用智能门铃与监控
                    </li>
                    <li className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />冷静思考，拒绝危险操作
                    </li>
                  </ul>
                </div>
                <Button
                  size="lg"
                  className="w-full rounded-full bg-white text-lg font-semibold text-sky-600 hover:bg-slate-100"
                  onClick={() => setGameState("explore")}
                >
                  开始探索 3D 安全屋
                </Button>
              </CardContent>
            </Card>
          </section>
        )}

        {gameState === "explore" && (
          <section className="grid gap-6 lg:grid-cols-[380px_1fr]">
            <Card className="bg-white/85 backdrop-blur overflow-auto">
              <CardHeader className="flex flex-col gap-2">
                <CardTitle className="text-2xl font-semibold text-slate-800">守护进度</CardTitle>
                <p className="text-sm text-slate-500">完成全部任务即可解锁安全守护勋章。</p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="rounded-xl bg-gradient-to-r from-sky-100 via-indigo-100 to-rose-100 p-6 shadow-inner">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-sky-700">累计星星</p>
                      <div className="mt-1 flex items-center gap-2 text-2xl font-bold text-slate-800">
                        <Star className="h-6 w-6 fill-amber-400 text-amber-400" />
                        {stars} / {TOTAL_STARS}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-purple-700">守护积分</p>
                      <p className="mt-1 text-2xl font-bold text-slate-800">{score}</p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-emerald-700">完成率</p>
                      <p className="mt-1 text-2xl font-bold text-slate-800">{progress}%</p>
                    </div>
                  </div>
                  <Progress value={progress} className="mt-4 h-3 bg-white/60" />
                </div>

                <div className="space-y-4">
                  {hazards.map((hazard) => {
                    const isCompleted = completedHazards.includes(hazard.id)
                    const hazardAttempts = attempts[hazard.id] ?? 0
                    return (
                      <div
                        key={hazard.id}
                        className={`flex items-start gap-3 rounded-xl border p-4 shadow-sm transition hover:shadow-md ${
                          isCompleted ? "border-emerald-200 bg-emerald-50/70" : "border-slate-200 bg-white"
                        }`}
                      >
                        <div className="rounded-full bg-slate-100 p-2">{hazard.icon}</div>
                        <div className="flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-semibold text-slate-800">{hazard.title}</h3>
                            <Badge className="bg-slate-200 text-slate-700">{hazard.room}</Badge>
                            {isCompleted && (
                              <Badge className="bg-emerald-500 text-white">
                                已完成 · {hazardAttempts === 1 ? 3 : hazardAttempts === 2 ? 2 : 1} 颗星
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-slate-600">{hazard.story}</p>
                          {!isCompleted && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="mt-2"
                              onClick={() => openHazard(hazard)}
                            >
                              立即处理风险
                            </Button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                  <div
                    className={`flex items-start gap-3 rounded-xl border p-4 shadow-sm transition ${
                      finalStageCompleted
                        ? "border-emerald-200 bg-emerald-50/70"
                        : completedHazards.length === hazards.length
                          ? "border-amber-200 bg-amber-50/70"
                          : "border-slate-200 bg-white"
                    }`}
                  >
                    <div className="rounded-full bg-slate-100 p-2">
                      <AlertTriangle className={`h-6 w-6 ${finalStageCompleted ? "text-emerald-600" : "text-rose-500"}`} />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold text-slate-800">卧室 · 综合应急演练</h3>
                        <Badge className={finalStageCompleted ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"}>
                          {finalStageCompleted ? "已完成" : completedHazards.length === hazards.length ? "待挑战" : "未解锁"}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-600">
                        完成前三站后将解锁卧室的紧急演练，挑战成功可获得 {FINAL_STAGE_STARS} 颗星。
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="flex h-full flex-col overflow-hidden border-slate-200 bg-white/85 backdrop-blur">
              <CardHeader className="pb-4">
                <CardTitle className="text-2xl font-semibold text-slate-800">3D 安全屋</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 p-6 pt-0">
                <div className="relative h-full w-full overflow-hidden rounded-2xl border bg-slate-200 shadow-inner">
                  {/* @ts-expect-error - model-viewer is a custom element */}
                  <model-viewer
                    ref={modelViewerRef}
                    src={HOUSE_MODEL_URL}
                    alt="家庭安全智能屋"
                    camera-controls
                    touch-action="pan-y"
                    shadow-intensity="1"
                    exposure="0.95"
                    interaction-prompt="auto"
                    camera-orbit="35deg 75deg 0m"
                    field-of-view="45deg"
                    min-camera-orbit="auto auto 3m"
                    max-camera-orbit="auto auto 10m"
                    loading="eager"
                    reveal="auto"
                    style={{ width: "100%", height: "100%", background: "linear-gradient(#ecfeff, #ffffff)" }}
                  >
                    {hazards.map((hazard) => {
                      const isCompleted = completedHazards.includes(hazard.id)
                      return (
                        <button
                          key={hazard.id}
                          slot={`hotspot-${hazard.id}`}
                          data-position={hazard.position}
                          data-normal={hazard.normal}
                          className="group relative flex items-center justify-center cursor-pointer focus:outline-none"
                          onClick={() => openHazard(hazard)}
                          style={{ width: "40px", height: "40px" }}
                        >
                          {/* 闪烁动画外圈 */}
                          <span
                            className={`absolute inline-flex h-10 w-10 animate-ping rounded-full opacity-60 ${
                              isCompleted ? "bg-emerald-400" : "bg-sky-500"
                            }`}
                          />
                          {/* 中间圆点 */}
                          <span
                            className={`relative inline-flex h-5 w-5 rounded-full border-2 border-white shadow-lg ${
                              isCompleted ? "bg-emerald-500" : "bg-sky-600"
                            }`}
                          />
                          {/* 悬停时显示的标签 */}
                          <span
                            className={`absolute left-12 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border px-3 py-1.5 text-sm font-semibold shadow-lg opacity-0 group-hover:opacity-100 transition-opacity ${
                              isCompleted
                                ? "border-emerald-400/80 bg-emerald-500/95 text-white"
                                : "border-sky-400/80 bg-white/95 text-slate-800"
                            }`}
                          >
                            {hazard.room} · {isCompleted ? "已守护" : "点击处理"}
                          </span>
                        </button>
                      )
                    })}
                    {/* @ts-expect-error - model-viewer is a custom element */}
                  </model-viewer>
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {gameState === "final" && finalScenario && (
          <section className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <Card className="bg-white/85 backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl font-bold text-slate-900">
                  <AlertTriangle className="h-6 w-6 text-rose-500" />
                  最终挑战 · {finalScenario.title}
                </CardTitle>
                <p className="text-sm text-slate-600">{finalScenario.description}</p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-wrap items-center gap-4 rounded-xl bg-rose-50 p-4 text-rose-700">
                  <div className="flex items-center gap-3">
                    <AlarmClock className="h-6 w-6" />
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide">倒计时</p>
                      <p className="text-2xl font-bold text-rose-600">{finalTimer}s</p>
                    </div>
                  </div>
                  <Badge className="bg-rose-500 text-white">
                    步骤 {Math.min(finalProgress + 1, finalScenario.steps.length)} / {finalScenario.steps.length}
                  </Badge>
                  <div className="ml-auto flex items-center gap-2">
                    <Button
                      variant="outline"
                      className="border-rose-300 bg-white text-rose-600 hover:bg-rose-100"
                      disabled={hourglassUsed || !finalTimerActive}
                      onClick={handleUseHourglass}
                    >
                      <Hourglass className="mr-2 h-4 w-4" />
                      使用时间沙漏
                    </Button>
                    {hourglassUsed && (
                      <Badge className="bg-amber-500 text-white">已增加 15 秒</Badge>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-sm font-semibold text-slate-700">正确操作指引：</p>
                  <ul className="mt-3 space-y-2 text-sm text-slate-600">
                    {finalScenario.steps.map((step, index) => (
                      <li key={step.id}>
                        <span className="font-semibold text-slate-800">{index + 1}. {step.action}</span>
                        <span className="text-slate-500"> → {step.result}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  {finalScenario.steps.map((step, index) => {
                    const isDone = index < finalProgress
                    const isCurrent = index === finalProgress
                    return (
                      <Button
                        key={step.id}
                        onClick={() => handleFinalStepClick(step.id)}
                        className={`h-20 flex-col justify-center text-lg font-semibold ${
                          isDone
                            ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                            : isCurrent
                              ? "border-sky-300 bg-sky-50 text-sky-700"
                              : "border-slate-200 bg-white text-slate-700"
                        }`}
                        variant="outline"
                        disabled={isDone || !finalTimerActive}
                      >
                        <span>{step.label}</span>
                        <span className="mt-1 text-xs font-normal text-slate-500">
                          {isDone ? "已完成" : isCurrent ? "下一步" : "等待"}
                        </span>
                      </Button>
                    )
                  })}
                </div>

                {finalFeedback && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                    {finalFeedback}
                  </div>
                )}

                {!finalTimerActive && finalProgress < finalScenario.steps.length && (
                  <Button
                    onClick={handleFinalRetry}
                    className="w-full bg-rose-500 text-white hover:bg-rose-600"
                  >
                    重新抽取场景并再试一次
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-sky-50 via-indigo-50 to-rose-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl font-semibold text-slate-900">
                  <Shield className="h-6 w-6 text-sky-600" />
                  守护成果速览
                </CardTitle>
                <p className="text-sm text-slate-600">完成最终挑战可额外获得 {FINAL_STAGE_STARS} 颗星星！</p>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="rounded-xl bg-white/80 p-5 shadow-inner">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-sky-600">累计星星</p>
                      <p className="mt-1 flex items-center gap-2 text-2xl font-bold text-slate-900">
                        <Star className="h-6 w-6 fill-amber-400 text-amber-400" />
                        {stars} / {TOTAL_STARS}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">守护积分</p>
                      <p className="mt-1 text-2xl font-bold text-slate-900">{score}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">完成率</p>
                      <p className="mt-1 text-2xl font-bold text-slate-900">{progress}%</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-semibold text-slate-700">已掌握的要点：</p>
                  <ul className="list-disc space-y-2 pl-5 text-sm text-slate-600">
                    {hazards.map((hazard) => (
                      <li key={hazard.id}>
                        <span className="font-semibold text-slate-800">{hazard.room}：</span>
                        {hazard.knowledgeHighlights[0]}
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-slate-500">更多提示可在挑战完成后查看完整复盘。</p>
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {gameState === "complete" && (
          <section className="mx-auto grid max-w-4xl gap-6 md:grid-cols-[1.1fr_0.9fr]">
            <Card className="bg-gradient-to-br from-emerald-100 via-sky-100 to-indigo-100 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-3xl font-bold text-slate-900">
                  <Award className="h-8 w-8 text-emerald-600" />
                  恭喜！你成为家庭安全小卫士
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 text-slate-700">
                <div className="rounded-2xl bg-white/70 p-6 shadow-inner">
                  <div className="flex flex-wrap items-center justify-between gap-6">
                    <div>
                      <p className="text-sm text-slate-500">星星总数</p>
                      <div className="mt-2 flex items-center gap-3 text-3xl font-bold text-slate-900">
                        <Star className="h-8 w-8 fill-amber-400 text-amber-400" />
                        {stars} / {TOTAL_STARS}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">守护积分</p>
                      <p className="mt-2 text-3xl font-bold text-slate-900">{score}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">完成率</p>
                      <p className="mt-2 text-3xl font-bold text-slate-900">{progress}%</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-base font-semibold text-slate-800">安全知识复盘：</p>
                  {hazards.map((hazard) => (
                    <div key={hazard.id} className="rounded-xl border border-slate-200 bg-white/80 p-4">
                      <div className="flex items-center gap-2">
                        {hazard.icon}
                        <div>
                          <h3 className="text-lg font-semibold text-slate-800">{hazard.room}</h3>
                          <p className="text-sm text-slate-500">{hazard.title}</p>
                        </div>
                      </div>
                      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-600">
                        {hazard.knowledgeHighlights.map((note, index) => (
                          <li key={index}>{note}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>

                <div className="rounded-xl bg-sky-500/90 p-4 text-white">
                  <p className="text-lg font-semibold">分享建议</p>
                  <p className="mt-2 text-sm">
                    和家人一起复盘这些安全守护技巧，检查家里是否存在类似的安全隐患，制定属于你们的家庭安全守护计划。
                  </p>
                </div>

                <Button
                  className="w-full rounded-full bg-slate-900 text-lg font-semibold text-white hover:bg-slate-800"
                  onClick={() => {
                    setGameState("explore")
                    setActiveHazard(null)
                    setActiveQuestion(null)
                    setDialogOpen(false)
                    setFeedback(null)
                    setAttempts({})
                    setCompletedHazards([])
                    setActiveSafetyNote(null)
                    setStars(0)
                    setScore(0)
                    setFinalStageCompleted(false)
                    setFinalScenario(null)
                    setFinalProgress(0)
                    setFinalTimer(0)
                    setFinalTimerActive(false)
                    setHourglassUsed(false)
                    setFinalFeedback(null)
                    setHiddenOptionIds([])
                    setToolUsed(false)
                    setToolMessage(null)
                  }}
                >
                  再次挑战，巩固守护力
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-white/85 backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl text-slate-800">
                  <Shield className="h-6 w-6 text-sky-600" />
                  赛场展示建议
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-slate-600">
                <p>
                  演示时可先快速旋转 3D 房屋，介绍每个热点代表的安全场景，再展示答题流程和知识卡片，突出你的创意与主题贴合度。
                </p>
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-sm font-semibold text-slate-700">一分钟问答准备</p>
                  <ul className="mt-2 list-disc space-y-2 pl-5">
                    <li>为什么选择这些安全场景？</li>
                    <li>模型或交互设计的亮点是什么？</li>
                    <li>如果要扩展作品，还可以加入哪些智能设备？</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </section>
        )}
      </main>

      <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-xl" showCloseButton>
          {activeHazard && (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-2xl text-slate-900">
                  {activeHazard.icon}
                  {activeHazard.title}
                </DialogTitle>
                <DialogDescription className="text-base text-slate-600">
                  {activeHazard.story}
                </DialogDescription>
              </DialogHeader>

              <div className="rounded-xl bg-slate-50 p-4 text-slate-700">
                <p className="font-semibold">问题：</p>
                <p>{activeQuestion?.prompt}</p>
              </div>

              {activeQuestion?.toolEffect && (
                <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sky-800">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold">道具：{activeQuestion.toolEffect.label}</p>
                      <p className="text-sm text-sky-700/80">{activeQuestion.toolEffect.description}</p>
                    </div>
                    {!toolUsed ? (
                      <Button
                        variant="outline"
                        className="border-sky-300 bg-white text-sky-700 hover:bg-sky-100"
                        onClick={handleUseTool}
                      >
                        使用道具
                      </Button>
                    ) : (
                      <Badge className="bg-sky-600 text-white">道具已使用</Badge>
                    )}
                  </div>
                  {toolUsed && toolMessage && (
                    <p className="mt-3 rounded-lg bg-white/70 p-3 text-sm text-sky-700">{toolMessage}</p>
                  )}
                </div>
              )}

              <div className="space-y-3">
                {visibleOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => handleAnswer(option.id)}
                    className="w-full rounded-xl border border-slate-200 bg-white p-4 text-left text-slate-700 transition hover:border-sky-400 hover:bg-sky-50 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <p className="text-base font-semibold text-slate-800">
                      {option.letter}. {option.label}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">{option.description}</p>
                  </button>
                ))}
                {visibleOptions.length === 0 && (
                  <p className="rounded-xl border border-dashed border-sky-200 bg-sky-50 p-4 text-sm text-sky-700">
                    道具已经帮你锁定了正确答案，快点击完成作答吧！
                  </p>
                )}
              </div>

              {feedback && (
                <div
                  className={`flex items-start gap-3 rounded-xl border p-4 ${
                    feedback.type === "correct"
                      ? "border-emerald-300 bg-emerald-50"
                      : "border-rose-300 bg-rose-50"
                  }`}
                >
                  {feedback.type === "correct" ? (
                    <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                  ) : (
                    <XCircle className="h-6 w-6 text-rose-500" />
                  )}
                  <div>
                    <p className="font-semibold text-slate-800">{feedback.message}</p>
                    <p className="text-sm text-slate-600">{feedback.detail}</p>
                    {feedback.type === "correct" && activeSafetyNote && (
                      <p className="mt-2 text-sm text-emerald-700">安全提示：{activeSafetyNote}</p>
                    )}
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => handleDialogClose(false)}>
                  返回继续探索
                </Button>
                {feedback?.type === "correct" && (
                  <Button onClick={() => handleDialogClose(false)} className="bg-sky-500 text-white hover:bg-sky-600">
                    收下知识，前往下一个热点
                  </Button>
                )}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
