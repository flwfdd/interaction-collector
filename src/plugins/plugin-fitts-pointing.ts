import { JsPsych, JsPsychPlugin, ParameterType, TrialType } from "jspsych";

const info = <const>{
  name: "fitts-pointing",
  parameters: {
    target_width: {
      type: ParameterType.INT,
      default: 50,
      description: "Width/Diameter of the target in pixels",
    },
    target_distance: {
      type: ParameterType.INT,
      default: 200,
      description: "Distance from start to target center in pixels",
    },
    target_angle: {
      type: ParameterType.FLOAT,
      default: 0,
      description: "Angle of target relative to start position (degrees, 0 = right, 90 = down)",
    },
    target_shape: {
      type: ParameterType.SELECT,
      options: ["circle", "rect"],
      default: "circle",
      description: "Shape of the target",
    },
    start_radius: {
      type: ParameterType.INT,
      default: 20,
      description: "Radius of the start button",
    },
    canvas_width: {
      type: ParameterType.INT,
      default: window.innerWidth,
      description: "Width of the canvas",
    },
    canvas_height: {
      type: ParameterType.INT,
      default: window.innerHeight,
      description: "Height of the canvas",
    },
    show_feedback: {
      type: ParameterType.BOOL,
      default: true,
      description: "Show feedback after trial",
    },
    feedback_duration: {
      type: ParameterType.INT,
      default: 500,
      description: "Duration of feedback in ms",
    },
  },
};

type Info = typeof info;

class FittsPointingPlugin implements JsPsychPlugin<Info> {
  static info = info;
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private startTime!: number;
  private trajectory: { x: number; y: number; t: number }[] = [];
  private isTracking: boolean = false;
  private startX!: number;
  private startY!: number;
  private targetX!: number;
  private targetY!: number;

  constructor(private jsPsych: JsPsych) {}

  trial(display_element: HTMLElement, trial: TrialType<Info>) {
    // Setup canvas
    this.canvas = document.createElement("canvas");
    this.canvas.width = trial.canvas_width as number;
    this.canvas.height = trial.canvas_height as number;
    this.canvas.style.touchAction = "none"; // Prevent scrolling on mobile
    display_element.innerHTML = "";
    display_element.appendChild(this.canvas);
    this.ctx = this.canvas.getContext("2d")!;

    // Calculate positions - Center the task (start -> target) on the screen
    // Instead of fixing start at center, we fix the midpoint of start-target vector at center
    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2;
    const rad = ((trial.target_angle as number) * Math.PI) / 180;
    const dist = trial.target_distance as number;
    
    const dx = dist * Math.cos(rad);
    const dy = dist * Math.sin(rad);

    this.startX = cx - dx / 2;
    this.startY = cy - dy / 2;
    this.targetX = cx + dx / 2;
    this.targetY = cy + dy / 2;

    // Safety check: ensure elements are within bounds with some padding
    const padding = 10;
    const startR = trial.start_radius as number;
    const targetR = (trial.target_width as number) / 2;
    
    // Check if start or target is out of bounds
    const isOutOfBounds = (x: number, y: number, r: number) => {
      return x - r < padding || x + r > this.canvas.width - padding ||
             y - r < padding || y + r > this.canvas.height - padding;
    };

    if (isOutOfBounds(this.startX, this.startY, startR) || isOutOfBounds(this.targetX, this.targetY, targetR)) {
      console.warn(`Trial parameters (distance: ${dist}, angle: ${trial.target_angle}) result in off-screen elements.`);
      // Optionally clamp or adjust, but for experimental validity usually better to just warn or center as best as possible.
      // With the centering logic above, this only happens if distance > screen dimension.
    }

    // Initial state
    this.drawStart();
    this.setupListeners(trial);
  }

  private drawStart() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw start circle
    this.ctx.beginPath();
    this.ctx.arc(this.startX, this.startY, 20, 0, 2 * Math.PI);
    this.ctx.fillStyle = "#3498db";
    this.ctx.fill();
    this.ctx.strokeStyle = "#2980b9";
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
    
    // Draw instruction
    this.ctx.fillStyle = "#333";
    this.ctx.font = "16px Arial";
    this.ctx.textAlign = "center";
    this.ctx.fillText("Tap to Start", this.startX, this.startY - 30);
  }

  private drawTarget(trial: TrialType<Info>) {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw target
    this.ctx.beginPath();
    const targetWidth = trial.target_width as number;
    
    if (trial.target_shape === "circle") {
      this.ctx.arc(this.targetX, this.targetY, targetWidth / 2, 0, 2 * Math.PI);
    } else {
      this.ctx.rect(
        this.targetX - targetWidth / 2,
        this.targetY - targetWidth / 2,
        targetWidth,
        targetWidth
      );
    }
    this.ctx.fillStyle = "#e74c3c";
    this.ctx.fill();
    this.ctx.strokeStyle = "#c0392b";
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
  }

  private setupListeners(trial: TrialType<Info>) {
    // Helper to check if event is within start circle
    const isStartEvent = (e: MouseEvent | TouchEvent) => {
      const pos = this.getPos(e);
      const dist = Math.hypot(pos.x - this.startX, pos.y - this.startY);
      return dist <= (trial.start_radius as number);
    };

    // We need to track if the interaction started on the start button
    let isPressedOnStart = false;

    const handleDown = (e: MouseEvent | TouchEvent) => {
      if (isStartEvent(e)) {
        isPressedOnStart = true;
      }
    };

    const handleUp = (e: MouseEvent | TouchEvent) => {
      if (isPressedOnStart && isStartEvent(e)) {
        e.preventDefault();
        
        // Cleanup start listeners
        this.canvas.removeEventListener("mousedown", handleDown);
        this.canvas.removeEventListener("touchstart", handleDown);
        window.removeEventListener("mouseup", handleUp);
        window.removeEventListener("touchend", handleUp);

        this.startTrial(trial);
      }
      isPressedOnStart = false;
    };

    this.canvas.addEventListener("mousedown", handleDown);
    this.canvas.addEventListener("touchstart", handleDown);
    window.addEventListener("mouseup", handleUp);
    window.addEventListener("touchend", handleUp);
  }

  private startTrial(trial: TrialType<Info>) {
    this.startTime = performance.now();
    this.trajectory = [];
    this.isTracking = true;

    this.drawTarget(trial);

    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!this.isTracking) return;
      const pos = this.getPos(e);
      this.trajectory.push({
        x: pos.x,
        y: pos.y,
        t: performance.now() - this.startTime,
      });
    };

    // Track if press started on screen (for valid tap detection)
    let isPressed = false;

    const handleDown = (e: MouseEvent | TouchEvent) => {
      if (!this.isTracking) return;
      isPressed = true;
    };

    const handleUp = (e: MouseEvent | TouchEvent) => {
      if (!this.isTracking || !isPressed) return;
      e.preventDefault();
      
      const pos = this.getPos(e);
      this.endTrial(trial, pos);
      
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("touchmove", handleMove);
      this.canvas.removeEventListener("mousedown", handleDown);
      this.canvas.removeEventListener("touchstart", handleDown);
      window.removeEventListener("mouseup", handleUp);
      window.removeEventListener("touchend", handleUp);
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("touchmove", handleMove, { passive: false });
    this.canvas.addEventListener("mousedown", handleDown);
    this.canvas.addEventListener("touchstart", handleDown);
    window.addEventListener("mouseup", handleUp);
    window.addEventListener("touchend", handleUp);
  }

  private endTrial(trial: TrialType<Info>, endPos: { x: number; y: number }) {
    this.isTracking = false;
    const endTime = performance.now();
    const totalTime = endTime - this.startTime;

    // Check hit
    let isHit = false;
    let errorDist = 0;

    if (trial.target_shape === "circle") {
      const dist = Math.hypot(endPos.x - this.targetX, endPos.y - this.targetY);
      isHit = dist <= (trial.target_width as number) / 2;
      errorDist = dist;
    } else {
      const halfW = (trial.target_width as number) / 2;
      isHit =
        endPos.x >= this.targetX - halfW &&
        endPos.x <= this.targetX + halfW &&
        endPos.y >= this.targetY - halfW &&
        endPos.y <= this.targetY + halfW;
      
      // Simple error distance for rect (center to center)
      errorDist = Math.hypot(endPos.x - this.targetX, endPos.y - this.targetY);
    }

    const data = {
      target_width: trial.target_width,
      target_distance: trial.target_distance,
      target_angle: trial.target_angle,
      target_shape: trial.target_shape,

      rt: this.trajectory.length > 0 ? this.trajectory[0].t : 0,
      mt: totalTime - (this.trajectory.length > 0 ? this.trajectory[0].t : 0),
      total_time: totalTime,
      success: isHit,
      error_distance: errorDist,
      start_x: this.startX,
      start_y: this.startY,
      target_x: this.targetX,
      target_y: this.targetY,
      click_x: endPos.x,
      click_y: endPos.y,
      trajectory: this.trajectory,
    };

    if (trial.show_feedback) {
      this.drawFeedback(isHit);
      setTimeout(() => {
        this.jsPsych.finishTrial(data);
      }, (trial.feedback_duration as number));
    } else {
      this.jsPsych.finishTrial(data);
    }
  }

  private drawFeedback(isHit: boolean) {
    this.ctx.save();
    this.ctx.fillStyle = isHit ? "rgba(46, 204, 113, 0.5)" : "rgba(231, 76, 60, 0.5)";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    this.ctx.fillStyle = "#fff";
    this.ctx.font = "bold 48px Arial";
    this.ctx.textAlign = "center";
    this.ctx.fillText(isHit ? "HIT!" : "MISS", this.canvas.width / 2, this.canvas.height / 2);
    this.ctx.restore();
  }

  private getPos(e: MouseEvent | TouchEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    let clientX, clientY;

    if (e instanceof MouseEvent) {
      clientX = e.clientX;
      clientY = e.clientY;
    } else {
      clientX = e.changedTouches[0].clientX;
      clientY = e.changedTouches[0].clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }
}

export default FittsPointingPlugin;
