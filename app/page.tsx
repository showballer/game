"use client"

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import Script from "next/script"
import {
  AlertTriangle,
  Award,
  CheckCircle2,
  Compass,
  Droplets,
  Flame,
  Home,
  Shield,
  Sparkles,
  Star,
  PhoneCall,
  Video,
  XCircle,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"

const HOUSE_MODEL_URL = "/api/house-model"

type GameState = "welcome" | "explore" | "complete"

type HazardOption = {
  id: string
  label: string
  description: string
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
  question: string
  story: string
  tip: string
  icon: ReactNode
  options: HazardOption[]
  correctOptionId: string
  position: string
  normal: string
  cameraTarget: string
  cameraOrbit: CameraOrbit
}

type FeedbackState = {
  type: "correct" | "incorrect"
  message: string
  detail: string
  starsEarned?: number
}

const hazards: Hazard[] = [
  {
    id: "door-safety",
    room: "玄关",
    title: "陌生人敲门怎么办？",
    story: "你一个人在家，门铃突然响了，对方说要进屋检查水电……",
    question: "此时你应该怎么做最安全？",
    tip: "先确认身份，再联系可信的大人，拒绝贸然开门。",
    icon: <Home className="h-6 w-6 text-sky-600" />, 
    options: [
      {
        id: "verify",
        label: "使用可视门铃确认并立刻联系家长",
        description: "通过门口摄像头观察，并拨打家长电话确认是否需要开门。",
      },
      {
        id: "open",
        label: "相信对方立即开门",
        description: "即使对方穿着工作服，也可能是假冒的陌生人。",
      },
    ],
    correctOptionId: "verify",
    position: "1.1 1.4 3.2",
    normal: "0 1 -1",
    cameraTarget: "1.1m 1.4m 3.2m",
    cameraOrbit: { theta: "30deg", phi: "70deg", radius: "4.2m" },
  },
  {
    id: "kitchen-fire",
    room: "厨房",
    title: "灶台突然冒烟",
    story: "你闻到厨房有浓浓的煤气味，锅里还冒着火焰。",
    question: "为了保护自己和家人，第一步应该做什么？",
    tip: "先关闭火源和燃气阀，再呼叫家长或119。",
    icon: <Flame className="h-6 w-6 text-orange-600" />, 
    options: [
      {
        id: "close-valve",
        label: "关掉燃气阀门并打开窗户通风",
        description: "立刻关闭灶台并保持距离，避免火势扩大。",
      },
      {
        id: "water",
        label: "倒一盆水直接浇到火上",
        description: "油火遇水会四处飞溅，更容易引发危险。",
      },
    ],
    correctOptionId: "close-valve",
    position: "-1.8 1.6 1.4",
    normal: "0 1 -1",
    cameraTarget: "-1.8m 1.5m 1.4m",
    cameraOrbit: { theta: "120deg", phi: "65deg", radius: "4m" },
  },
  {
    id: "bathroom-electric",
    room: "卫生间",
    title: "湿手碰电安全吗？",
    story: "洗完手的你想立即用吹风机，插座就在水池旁边。",
    question: "下一步最安全的操作是什么？",
    tip: "保持干燥和距离，电器远离水汽才安心。",
    icon: <Droplets className="h-6 w-6 text-purple-600" />, 
    options: [
      {
        id: "dry-hands",
        label: "先擦干双手并检查插座周围是否干燥",
        description: "保证手和地面都干燥，再使用电器更安全。",
      },
      {
        id: "use-now",
        label: "马上插上电源使用",
        description: "湿手接触电器容易触电，十分危险。",
      },
    ],
    correctOptionId: "dry-hands",
    position: "0.5 1.8 -2.4",
    normal: "0 1 1",
    cameraTarget: "0.5m 1.7m -2.4m",
    cameraOrbit: { theta: "210deg", phi: "60deg", radius: "3.8m" },
  },
]

const TOTAL_STARS = hazards.length * 3

export default function HomeSafetyGuardian() {
  const [gameState, setGameState] = useState<GameState>("welcome")
  const [activeHazard, setActiveHazard] = useState<Hazard | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [feedback, setFeedback] = useState<FeedbackState | null>(null)
  const [attempts, setAttempts] = useState<Record<string, number>>({})
  const [completedHazards, setCompletedHazards] = useState<string[]>([])
  const [stars, setStars] = useState(0)
  const [score, setScore] = useState(0)
  const [modelLoaded, setModelLoaded] = useState(false)
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

  const openHazard = (hazard: Hazard) => {
    focusHazard(hazard)
    setActiveHazard(hazard)
    setDialogOpen(true)
    setFeedback(null)
  }

  const handleAnswer = (optionId: string) => {
    if (!activeHazard) return

    const previousAttempts = attempts[activeHazard.id] ?? 0
    const nextAttempts = previousAttempts + 1
    const isCorrect = optionId === activeHazard.correctOptionId

    setAttempts((prev) => ({ ...prev, [activeHazard.id]: nextAttempts }))

    if (isCorrect) {
      const starsEarned = nextAttempts === 1 ? 3 : nextAttempts === 2 ? 2 : 1
      setFeedback({
        type: "correct",
        message: "太棒了！你做出了最安全的选择。",
        detail: `本题获得 ${starsEarned} 颗星星。`,
        starsEarned,
      })
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

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open)
    if (!open) {
      setActiveHazard(null)
      setFeedback(null)
    }
  }

  useEffect(() => {
    if (gameState === "explore" && completedHazards.length === hazards.length) {
      const timer = setTimeout(() => setGameState("complete"), 1200)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [completedHazards, gameState])

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
                        <h3 className="text-lg font-semibold text-slate-800">{hazard.room}</h3>
                      </div>
                      <p className="mt-2 text-slate-600">{hazard.tip}</p>
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
                    setDialogOpen(false)
                    setFeedback(null)
                    setAttempts({})
                    setCompletedHazards([])
                    setStars(0)
                    setScore(0)
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
                <p>{activeHazard.question}</p>
              </div>

              <div className="space-y-3">
                {activeHazard.options.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => handleAnswer(option.id)}
                    className="w-full rounded-xl border border-slate-200 bg-white p-4 text-left text-slate-700 transition hover:border-sky-400 hover:bg-sky-50 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <p className="text-base font-semibold text-slate-800">{option.label}</p>
                    <p className="mt-1 text-sm text-slate-600">{option.description}</p>
                  </button>
                ))}
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
                    {feedback.type === "correct" && activeHazard.tip && (
                      <p className="mt-2 text-sm text-emerald-700">安全提示：{activeHazard.tip}</p>
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
