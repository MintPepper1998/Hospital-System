"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Gamepad2, Trophy, Play, RotateCcw, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from "lucide-react"

const GRID_SIZE = 20
const CELL_SIZE = 20
const INITIAL_SPEED = 150

type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT"
type Point = { x: number; y: number }

export function SnakeGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [snake, setSnake] = useState<Point[]>([{ x: 10, y: 10 }])
  const [food, setFood] = useState<Point>({ x: 15, y: 15 })
  const [direction, setDirection] = useState<Direction>("RIGHT")
  const [gameRunning, setGameRunning] = useState(false)
  const [gameOver, setGameOver] = useState(false)
  const [score, setScore] = useState(0)
  const [highScore, setHighScore] = useState(0)
  const [speed, setSpeed] = useState(INITIAL_SPEED)

  const directionRef = useRef<Direction>("RIGHT")
  const snakeRef = useRef<Point[]>([{ x: 10, y: 10 }])
  const foodRef = useRef<Point>({ x: 15, y: 15 })
  const scoreRef = useRef(0)
  const gameRunningRef = useRef(false)

  // Load high score from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("snake-high-score")
    if (saved) setHighScore(parseInt(saved))
  }, [])

  const generateFood = useCallback((currentSnake: Point[]): Point => {
    let newFood: Point
    do {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      }
    } while (currentSnake.some((seg) => seg.x === newFood.x && seg.y === newFood.y))
    return newFood
  }, [])

  const resetGame = useCallback(() => {
    const initialSnake = [{ x: 10, y: 10 }]
    const initialFood = generateFood(initialSnake)
    setSnake(initialSnake)
    setFood(initialFood)
    setDirection("RIGHT")
    setScore(0)
    setSpeed(INITIAL_SPEED)
    setGameOver(false)
    setGameRunning(false)
    snakeRef.current = initialSnake
    foodRef.current = initialFood
    directionRef.current = "RIGHT"
    scoreRef.current = 0
    gameRunningRef.current = false
  }, [generateFood])

  const startGame = useCallback(() => {
    if (gameOver) resetGame()
    setGameRunning(true)
    gameRunningRef.current = true
  }, [gameOver, resetGame])

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!gameRunningRef.current && !gameOver && (e.key === " " || e.key === "Enter")) {
        e.preventDefault()
        startGame()
        return
      }

      const current = directionRef.current
      switch (e.key) {
        case "ArrowUp":
        case "w":
        case "W":
          e.preventDefault()
          if (current !== "DOWN") { directionRef.current = "UP"; setDirection("UP") }
          break
        case "ArrowDown":
        case "s":
        case "S":
          e.preventDefault()
          if (current !== "UP") { directionRef.current = "DOWN"; setDirection("DOWN") }
          break
        case "ArrowLeft":
        case "a":
        case "A":
          e.preventDefault()
          if (current !== "RIGHT") { directionRef.current = "LEFT"; setDirection("LEFT") }
          break
        case "ArrowRight":
        case "d":
        case "D":
          e.preventDefault()
          if (current !== "LEFT") { directionRef.current = "RIGHT"; setDirection("RIGHT") }
          break
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [gameOver, startGame])

  // Game loop
  useEffect(() => {
    if (!gameRunning) return

    const interval = setInterval(() => {
      const currentSnake = [...snakeRef.current]
      const head = { ...currentSnake[0] }
      const dir = directionRef.current

      switch (dir) {
        case "UP": head.y -= 1; break
        case "DOWN": head.y += 1; break
        case "LEFT": head.x -= 1; break
        case "RIGHT": head.x += 1; break
      }

      // Check wall collision
      if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
        setGameRunning(false)
        setGameOver(true)
        gameRunningRef.current = false
        const finalScore = scoreRef.current
        setHighScore(prev => {
          const newHigh = Math.max(prev, finalScore)
          localStorage.setItem("snake-high-score", String(newHigh))
          return newHigh
        })
        return
      }

      // Check self collision
      if (currentSnake.some((seg) => seg.x === head.x && seg.y === head.y)) {
        setGameRunning(false)
        setGameOver(true)
        gameRunningRef.current = false
        const finalScore = scoreRef.current
        setHighScore(prev => {
          const newHigh = Math.max(prev, finalScore)
          localStorage.setItem("snake-high-score", String(newHigh))
          return newHigh
        })
        return
      }

      const newSnake = [head, ...currentSnake]

      // Check food collision
      if (head.x === foodRef.current.x && head.y === foodRef.current.y) {
        const newScore = scoreRef.current + 10
        scoreRef.current = newScore
        setScore(newScore)
        const newFood = generateFood(newSnake)
        foodRef.current = newFood
        setFood(newFood)
        // Speed up every 50 points
        if (newScore % 50 === 0) {
          setSpeed((prev) => Math.max(prev - 10, 50))
        }
      } else {
        newSnake.pop()
      }

      snakeRef.current = newSnake
      setSnake(newSnake)
    }, speed)

    return () => clearInterval(interval)
  }, [gameRunning, speed, generateFood])

  // Draw canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const width = GRID_SIZE * CELL_SIZE
    const height = GRID_SIZE * CELL_SIZE

    // Background
    ctx.fillStyle = "#1a1a2e"
    ctx.fillRect(0, 0, width, height)

    // Grid lines
    ctx.strokeStyle = "#16213e"
    ctx.lineWidth = 0.5
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath()
      ctx.moveTo(i * CELL_SIZE, 0)
      ctx.lineTo(i * CELL_SIZE, height)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(0, i * CELL_SIZE)
      ctx.lineTo(width, i * CELL_SIZE)
      ctx.stroke()
    }

    // Snake
    snake.forEach((seg, i) => {
      const isHead = i === 0
      const gradient = ctx.createLinearGradient(
        seg.x * CELL_SIZE, seg.y * CELL_SIZE,
        (seg.x + 1) * CELL_SIZE, (seg.y + 1) * CELL_SIZE
      )
      if (isHead) {
        gradient.addColorStop(0, "#4ade80")
        gradient.addColorStop(1, "#22c55e")
      } else {
        gradient.addColorStop(0, "#22c55e")
        gradient.addColorStop(1, "#16a34a")
      }
      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.roundRect(
        seg.x * CELL_SIZE + 1, seg.y * CELL_SIZE + 1,
        CELL_SIZE - 2, CELL_SIZE - 2,
        isHead ? 5 : 3
      )
      ctx.fill()

      // Eyes on head
      if (isHead) {
        ctx.fillStyle = "white"
        const eyeSize = 3
        let eyeX1, eyeY1, eyeX2, eyeY2
        switch (directionRef.current) {
          case "RIGHT":
            eyeX1 = seg.x * CELL_SIZE + 13; eyeY1 = seg.y * CELL_SIZE + 5
            eyeX2 = seg.x * CELL_SIZE + 13; eyeY2 = seg.y * CELL_SIZE + 13
            break
          case "LEFT":
            eyeX1 = seg.x * CELL_SIZE + 5; eyeY1 = seg.y * CELL_SIZE + 5
            eyeX2 = seg.x * CELL_SIZE + 5; eyeY2 = seg.y * CELL_SIZE + 13
            break
          case "UP":
            eyeX1 = seg.x * CELL_SIZE + 5; eyeY1 = seg.y * CELL_SIZE + 5
            eyeX2 = seg.x * CELL_SIZE + 13; eyeY2 = seg.y * CELL_SIZE + 5
            break
          case "DOWN":
            eyeX1 = seg.x * CELL_SIZE + 5; eyeY1 = seg.y * CELL_SIZE + 13
            eyeX2 = seg.x * CELL_SIZE + 13; eyeY2 = seg.y * CELL_SIZE + 13
            break
        }
        ctx.beginPath()
        ctx.arc(eyeX1!, eyeY1!, eyeSize, 0, Math.PI * 2)
        ctx.fill()
        ctx.beginPath()
        ctx.arc(eyeX2!, eyeY2!, eyeSize, 0, Math.PI * 2)
        ctx.fill()
      }
    })

    // Food
    ctx.fillStyle = "#ef4444"
    ctx.beginPath()
    ctx.arc(
      food.x * CELL_SIZE + CELL_SIZE / 2,
      food.y * CELL_SIZE + CELL_SIZE / 2,
      CELL_SIZE / 2 - 2,
      0, Math.PI * 2
    )
    ctx.fill()
    // Food shine
    ctx.fillStyle = "rgba(255,255,255,0.3)"
    ctx.beginPath()
    ctx.arc(
      food.x * CELL_SIZE + CELL_SIZE / 2 - 2,
      food.y * CELL_SIZE + CELL_SIZE / 2 - 2,
      3, 0, Math.PI * 2
    )
    ctx.fill()

    // Game Over overlay
    if (gameOver) {
      ctx.fillStyle = "rgba(0,0,0,0.7)"
      ctx.fillRect(0, 0, width, height)
      ctx.fillStyle = "#ef4444"
      ctx.font = "bold 28px Inter, sans-serif"
      ctx.textAlign = "center"
      ctx.fillText("GAME OVER", width / 2, height / 2 - 15)
      ctx.fillStyle = "#94a3b8"
      ctx.font = "14px Inter, sans-serif"
      ctx.fillText(`Score: ${score}`, width / 2, height / 2 + 15)
      ctx.fillText("Press Enter or click Play to restart", width / 2, height / 2 + 40)
    }

    // Not started overlay
    if (!gameRunning && !gameOver) {
      ctx.fillStyle = "rgba(0,0,0,0.5)"
      ctx.fillRect(0, 0, width, height)
      ctx.fillStyle = "#4ade80"
      ctx.font = "bold 24px Inter, sans-serif"
      ctx.textAlign = "center"
      ctx.fillText("🐍 SNAKE", width / 2, height / 2 - 15)
      ctx.fillStyle = "#94a3b8"
      ctx.font = "14px Inter, sans-serif"
      ctx.fillText("Press Enter or click Play to start", width / 2, height / 2 + 15)
    }
  }, [snake, food, gameOver, gameRunning, score, direction])

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-green-600 to-emerald-600 text-white pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-white">
              <Gamepad2 className="h-5 w-5" />
              Snake Game
            </CardTitle>
            <CardDescription className="text-green-100 mt-1">
              Take a break! Use arrow keys or WASD to play.
            </CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs text-green-200">Score</p>
              <p className="text-xl font-bold">{score}</p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1 text-xs text-green-200">
                <Trophy className="h-3 w-3" />
                Best
              </div>
              <p className="text-xl font-bold">{highScore}</p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* Game Canvas */}
          <div className="relative">
            <canvas
              ref={canvasRef}
              width={GRID_SIZE * CELL_SIZE}
              height={GRID_SIZE * CELL_SIZE}
              className="rounded-xl border-2 border-slate-200 shadow-inner"
            />
          </div>

          {/* Controls & Info */}
          <div className="flex flex-col gap-4 min-w-[200px]">
            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                onClick={gameOver ? () => { resetGame(); setTimeout(startGame, 50) } : startGame}
                disabled={gameRunning}
                className="bg-green-600 hover:bg-green-700"
              >
                <Play className="h-4 w-4 mr-1" />
                {gameOver ? "Play Again" : "Play"}
              </Button>
              <Button onClick={resetGame} variant="outline" size="icon">
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>

            {/* Status */}
            <div className="flex items-center gap-2">
              <Badge variant={gameRunning ? "default" : gameOver ? "destructive" : "secondary"}>
                {gameRunning ? "🟢 Playing" : gameOver ? "💀 Game Over" : "⏸ Paused"}
              </Badge>
              <Badge variant="outline">
                🐍 Length: {snake.length}
              </Badge>
            </div>

            {/* Mobile Controls */}
            <div className="lg:hidden">
              <p className="text-xs text-muted-foreground mb-2 font-medium">Touch Controls:</p>
              <div className="grid grid-cols-3 gap-1 w-[130px]">
                <div />
                <Button variant="outline" size="icon" className="h-10 w-10" onClick={() => { if (directionRef.current !== "DOWN") { directionRef.current = "UP"; setDirection("UP") } }}>
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <div />
                <Button variant="outline" size="icon" className="h-10 w-10" onClick={() => { if (directionRef.current !== "RIGHT") { directionRef.current = "LEFT"; setDirection("LEFT") } }}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-10 w-10" onClick={() => { if (directionRef.current !== "UP") { directionRef.current = "DOWN"; setDirection("DOWN") } }}>
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-10 w-10" onClick={() => { if (directionRef.current !== "LEFT") { directionRef.current = "RIGHT"; setDirection("RIGHT") } }}>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Instructions */}
            <div className="text-xs text-muted-foreground space-y-1 bg-slate-50 rounded-lg p-3">
              <p className="font-semibold text-slate-700 mb-1">How to Play:</p>
              <p>• Arrow keys or WASD to move</p>
              <p>• Eat red food to grow & score</p>
              <p>• Don&apos;t hit walls or yourself</p>
              <p>• Speed increases every 50 pts!</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
