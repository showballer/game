"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Trophy, Star, Home, AlertTriangle, CheckCircle2, XCircle, Phone, Flame, Droplets, Hand } from "lucide-react"

type GameState = "welcome" | "map" | "playing" | "complete"
type FeedbackType = "correct" | "incorrect" | null

interface DragItem {
  id: string
  icon: React.ReactNode
  label: string
}

interface Scenario {
  id: number
  title: string
  description: string
  room: string
  instruction: string
  dragItems: DragItem[]
  correctItemId: string
  correctFeedback: string
  incorrectFeedback: string
  safetyTip: string
  bgColor: string
}

const scenarios: Scenario[] = [
  {
    id: 1,
    title: "陌生人敲门",
    description: "你一个人在家，突然听到门外有陌生人敲门...",
    room: "玄关",
    instruction: "拖动正确的物品到场景中来保护自己！",
    dragItems: [
      { id: "phone", icon: <Phone className="w-8 h-8" />, label: "打电话给家长" },
      { id: "door", icon: <Home className="w-8 h-8" />, label: "直接开门" },
    ],
    correctItemId: "phone",
    correctFeedback: "太棒了！遇到陌生人一定要先联系家长！",
    incorrectFeedback: "危险！不能随便给陌生人开门！",
    safetyTip: "独自在家时，不要给陌生人开门，可以通过猫眼观察或联系家长。",
    bgColor: "from-blue-100 to-blue-200",
  },
  {
    id: 2,
    title: "厨房燃气泄漏",
    description: "你发现厨房的燃气灶还开着，火焰很大...",
    room: "厨房",
    instruction: "快速拖动正确的操作来避免危险！",
    dragItems: [
      { id: "valve", icon: <Flame className="w-8 h-8" />, label: "关闭燃气阀门" },
      { id: "ignore", icon: <XCircle className="w-8 h-8" />, label: "不管它" },
    ],
    correctItemId: "valve",
    correctFeedback: "做得好！及时关闭燃气可以避免火灾！",
    incorrectFeedback: "危险！燃气灶无人看管很危险！",
    safetyTip: "使用燃气后要及时关闭，离开厨房前检查所有火源是否关闭。",
    bgColor: "from-orange-100 to-red-200",
  },
  {
    id: 3,
    title: "湿手触电危险",
    description: "你刚洗完手，手上还有水，想要使用电器插座...",
    room: "卫生间",
    instruction: "拖动正确的物品来确保安全！",
    dragItems: [
      { id: "towel", icon: <Droplets className="w-8 h-8" />, label: "用毛巾擦干手" },
      { id: "touch", icon: <Hand className="w-8 h-8" />, label: "直接触碰插座" },
    ],
    correctItemId: "towel",
    correctFeedback: "非常正确！湿手触碰电器会导致触电！",
    incorrectFeedback: "危险！湿手触碰电器会触电！",
    safetyTip: "使用电器前要确保手是干燥的，不要用湿手触碰插座和电器。",
    bgColor: "from-purple-100 to-pink-200",
  },
]

const rooms = [
  { name: "玄关", x: "15%", y: "45%", scenarioId: 1 },
  { name: "厨房", x: "25%", y: "15%", scenarioId: 2 },
  { name: "卫生间", x: "75%", y: "20%", scenarioId: 3 },
]

export default function HomeSafetyGame() {
  const [gameState, setGameState] = useState<GameState>("welcome")
  const [currentLevel, setCurrentLevel] = useState(0)
  const [score, setScore] = useState(0)
  const [stars, setStars] = useState(0)
  const [feedback, setFeedback] = useState<FeedbackType>(null)
  const [showFeedback, setShowFeedback] = useState(false)
  const [draggedItem, setDraggedItem] = useState<string | null>(null)
  const [isDropZoneActive, setIsDropZoneActive] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [pulsingRooms, setPulsingRooms] = useState<number[]>([])

  useEffect(() => {
    if (gameState === "map") {
      const completedScenarios = currentLevel
      const availableScenarios = rooms.filter((_, index) => index === completedScenarios).map((room) => room.scenarioId)
      setPulsingRooms(availableScenarios)
    }
  }, [gameState, currentLevel])

  const handleDragStart = (itemId: string) => {
    setDraggedItem(itemId)
  }

  const handleDragEnd = () => {
    setDraggedItem(null)
    setIsDropZoneActive(false)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDropZoneActive(true)
  }

  const handleDragLeave = () => {
    setIsDropZoneActive(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDropZoneActive(false)

    const scenario = scenarios[currentLevel]
    const isCorrect = draggedItem === scenario.correctItemId

    setAttempts(attempts + 1)
    setFeedback(isCorrect ? "correct" : "incorrect")
    setShowFeedback(true)

    if (isCorrect) {
      const earnedStars = attempts === 0 ? 3 : attempts === 1 ? 2 : 1
      setStars(stars + earnedStars)
      setScore(score + 10)

      setTimeout(() => {
        setShowFeedback(false)
        setFeedback(null)
        setAttempts(0)
        if (currentLevel < scenarios.length - 1) {
          setCurrentLevel(currentLevel + 1)
          setGameState("map")
        } else {
          setGameState("complete")
        }
      }, 2500)
    } else {
      setTimeout(() => {
        setShowFeedback(false)
        setFeedback(null)
      }, 2000)
    }

    setDraggedItem(null)
  }

  const resetGame = () => {
    setGameState("welcome")
    setCurrentLevel(0)
    setScore(0)
    setStars(0)
    setFeedback(null)
    setShowFeedback(false)
    setAttempts(0)
  }

  const startGame = () => {
    setGameState("map")
  }

  const selectRoom = (scenarioId: number) => {
    const scenarioIndex = scenarios.findIndex((s) => s.id === scenarioId)
    if (scenarioIndex === currentLevel) {
      setGameState("playing")
    }
  }

  if (gameState === "welcome") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full p-8 text-center space-y-6 shadow-xl">
          <div className="flex justify-center animate-in zoom-in duration-500">
            <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-6 rounded-full shadow-lg">
              <Home className="w-16 h-16 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-800 animate-in fade-in slide-in-from-bottom-4 duration-700">
            家庭安全小卫士
          </h1>
          <p className="text-lg text-gray-600 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            通过互动游戏学习重要的家庭安全知识！
          </p>

          <div className="space-y-2 text-left bg-gradient-to-br from-yellow-50 to-orange-50 p-6 rounded-lg border-2 border-yellow-200 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2 text-lg">
              <Star className="w-5 h-5 text-yellow-500" />
              游戏特色：
            </h3>
            <ul className="text-gray-700 space-y-2 ml-7">
              <li>🗺️ 在家庭平面图上选择房间开始冒险</li>
              <li>🎯 拖拽正确的物品来解决安全问题</li>
              <li>⭐ 根据表现获得1-3颗星星</li>
              <li>🏆 完成所有关卡解锁安全知识宝典</li>
            </ul>
          </div>

          <Button
            onClick={startGame}
            size="lg"
            className="w-full text-lg bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-300 animate-in fade-in slide-in-from-bottom-4"
          >
            开始冒险
          </Button>
        </Card>
      </div>
    )
  }

  if (gameState === "map") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
        <Card className="max-w-4xl w-full p-8 space-y-6 shadow-xl">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-800">选择房间开始挑战</h2>
              <div className="flex items-center gap-4">
                <span className="font-semibold flex items-center gap-1 text-yellow-600">
                  <Star className="w-5 h-5 fill-yellow-500" />
                  {stars} 星星
                </span>
                <span className="font-semibold flex items-center gap-1 text-purple-600">
                  <Trophy className="w-5 h-5" />
                  {score} 分
                </span>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${(currentLevel / scenarios.length) * 100}%` }}
              />
            </div>
            <p className="text-sm text-gray-600">
              进度: {currentLevel} / {scenarios.length} 关卡完成
            </p>
          </div>

          <div className="relative bg-white p-4 rounded-lg shadow-inner">
            <img
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/40cd694b3cfe0d461b039a224f7939f6-5U1Afr6XVcz4zg3553ZvO2LjFL788k.png"
              alt="家庭平面图"
              className="w-full h-auto rounded-lg"
            />

            {rooms.map((room, index) => {
              const isCompleted = index < currentLevel
              const isAvailable = index === currentLevel
              const isPulsing = pulsingRooms.includes(room.scenarioId)

              return (
                <button
                  key={room.scenarioId}
                  onClick={() => selectRoom(room.scenarioId)}
                  disabled={!isAvailable}
                  className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ${
                    isAvailable ? "cursor-pointer hover:scale-110" : "cursor-not-allowed opacity-50"
                  } ${isPulsing ? "animate-pulse" : ""}`}
                  style={{ left: room.x, top: room.y }}
                >
                  <div
                    className={`relative flex flex-col items-center gap-2 p-4 rounded-full shadow-lg ${
                      isCompleted
                        ? "bg-green-500"
                        : isAvailable
                          ? "bg-gradient-to-br from-yellow-400 to-orange-500"
                          : "bg-gray-400"
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-8 h-8 text-white" />
                    ) : (
                      <AlertTriangle className="w-8 h-8 text-white" />
                    )}
                  </div>
                  <div
                    className={`mt-2 px-3 py-1 rounded-full text-sm font-semibold ${
                      isCompleted
                        ? "bg-green-100 text-green-800"
                        : isAvailable
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {room.name}
                  </div>
                </button>
              )
            })}
          </div>

          <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
            <p className="text-center text-gray-700">
              <span className="font-semibold">💡 提示：</span> 点击闪烁的房间图标开始挑战！
            </p>
          </div>
        </Card>
      </div>
    )
  }

  if (gameState === "playing") {
    const scenario = scenarios[currentLevel]

    return (
      <div className={`min-h-screen bg-gradient-to-br ${scenario.bgColor} flex items-center justify-center p-4`}>
        <Card className="max-w-3xl w-full p-8 space-y-6 shadow-xl">
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span className="font-semibold">
                {scenario.room} - 第 {currentLevel + 1} 关
              </span>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                  {stars}
                </span>
                <span className="flex items-center gap-1">
                  <Trophy className="w-4 h-4 text-purple-600" />
                  {score}
                </span>
              </div>
            </div>
          </div>

          <div className="text-center space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="bg-white p-6 rounded-full inline-block shadow-lg">
              <AlertTriangle className="w-16 h-16 text-orange-500" />
            </div>
            <h2 className="text-3xl font-bold text-gray-800">{scenario.title}</h2>
            <p className="text-gray-700 text-lg">{scenario.description}</p>
          </div>

          <div className="bg-white/80 backdrop-blur p-6 rounded-lg space-y-4">
            <p className="text-center text-gray-800 font-semibold text-lg">{scenario.instruction}</p>

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`min-h-[200px] border-4 border-dashed rounded-xl flex items-center justify-center transition-all duration-300 ${
                isDropZoneActive ? "border-blue-500 bg-blue-50 scale-105" : "border-gray-300 bg-gray-50"
              }`}
            >
              {draggedItem ? (
                <p className="text-xl font-semibold text-blue-600 animate-pulse">松开鼠标放置物品</p>
              ) : (
                <p className="text-gray-500 text-center">
                  <span className="text-2xl block mb-2">👇</span>
                  拖动下方的物品到这里
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {scenario.dragItems.map((item) => (
                <div
                  key={item.id}
                  draggable
                  onDragStart={() => handleDragStart(item.id)}
                  onDragEnd={handleDragEnd}
                  className={`bg-white border-2 border-gray-300 rounded-lg p-6 cursor-move hover:border-blue-500 hover:shadow-lg transition-all duration-300 flex flex-col items-center gap-3 ${
                    draggedItem === item.id ? "opacity-50 scale-95" : "hover:scale-105"
                  }`}
                >
                  <div className="text-blue-600">{item.icon}</div>
                  <p className="text-center font-semibold text-gray-800">{item.label}</p>
                </div>
              ))}
            </div>
          </div>

          {showFeedback && (
            <div
              className={`p-6 rounded-lg flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-300 ${
                feedback === "correct" ? "bg-green-100 border-4 border-green-500" : "bg-red-100 border-4 border-red-500"
              }`}
            >
              {feedback === "correct" ? (
                <>
                  <CheckCircle2 className="w-10 h-10 text-green-600 flex-shrink-0 animate-in zoom-in" />
                  <div>
                    <p className="text-green-800 font-bold text-lg">{scenario.correctFeedback}</p>
                    <p className="text-green-700 text-sm mt-1">
                      获得 {attempts === 0 ? "3" : attempts === 1 ? "2" : "1"} 颗星星！
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <XCircle className="w-10 h-10 text-red-600 flex-shrink-0 animate-in zoom-in" />
                  <div>
                    <p className="text-red-800 font-bold text-lg">{scenario.incorrectFeedback}</p>
                    <p className="text-red-700 text-sm mt-1">再试一次！</p>
                  </div>
                </>
              )}
            </div>
          )}

          <div className="flex justify-center">
            <Button onClick={() => setGameState("map")} variant="outline" className="border-2">
              返回地图
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  // Complete State
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full p-8 space-y-6 shadow-xl">
        <div className="text-center space-y-4">
          <div className="flex justify-center animate-in zoom-in duration-500">
            <div className="bg-gradient-to-br from-yellow-400 to-orange-500 p-8 rounded-full shadow-xl">
              <Trophy className="w-24 h-24 text-white" />
            </div>
          </div>
          <h2 className="text-4xl font-bold text-gray-800 animate-in fade-in slide-in-from-bottom-4">恭喜通关！</h2>

          <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-8 rounded-xl shadow-lg">
            <div className="flex justify-center gap-2 mb-4">
              {Array.from({ length: stars }).map((_, i) => (
                <Star
                  key={i}
                  className="w-8 h-8 fill-yellow-300 text-yellow-300 animate-in zoom-in"
                  style={{ animationDelay: `${i * 100}ms` }}
                />
              ))}
            </div>
            <p className="text-3xl font-bold">{stars} 颗星星</p>
            <p className="text-2xl font-bold mt-2">总积分: {score} 分</p>
            <p className="text-lg mt-3">你已经成为家庭安全小卫士！</p>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-yellow-500" />
            安全知识宝典
          </h3>
          <div className="space-y-3">
            {scenarios.map((scenario, index) => (
              <div
                key={index}
                className="bg-gradient-to-r from-blue-50 to-purple-50 p-5 rounded-lg border-2 border-blue-200"
              >
                <p className="text-gray-700">
                  <span className="font-bold text-blue-600">{scenario.room}：</span>
                  {scenario.safetyTip}
                </p>
              </div>
            ))}
          </div>

          <div className="bg-gradient-to-br from-yellow-50 to-orange-50 p-6 rounded-lg border-2 border-yellow-200 space-y-3">
            <h4 className="font-bold text-gray-800 text-lg">更多安全提示：</h4>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-lg">🏠</span>
                <span>独自在家时要锁好门窗，不给陌生人开门</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-lg">🔥</span>
                <span>不要玩火，发现火情及时告诉大人或拨打119</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-lg">⚡</span>
                <span>不要用湿手触碰电器，不要在插座上插太多电器</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-lg">🚨</span>
                <span>记住家长电话和紧急联系方式</span>
              </li>
            </ul>
          </div>
        </div>

        <Button
          onClick={resetGame}
          size="lg"
          className="w-full text-lg bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-300"
        >
          再玩一次
        </Button>
      </Card>
    </div>
  )
}
