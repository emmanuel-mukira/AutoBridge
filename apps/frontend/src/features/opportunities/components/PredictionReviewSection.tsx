import { useState, type FormEvent } from "react";
import { CircleCheck, TrendingDown, TrendingUp } from "lucide-react";
import { useAuth } from "@/app/auth/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useReviewPrediction } from "../hooks/useOpportunities";
import type { OpportunityPrediction, PredictionAssessment } from "../services/opportunitiesApi";

const labels: Record<PredictionAssessment, string> = {
  REASONABLE: "Reasonable",
  OVERESTIMATED: "Overestimated",
  UNDERESTIMATED: "Underestimated",
};

const assessmentStyle: Record<PredictionAssessment, string> = {
  REASONABLE: "border-emerald-500/50 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300",
  OVERESTIMATED: "border-amber-500/50 bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300",
  UNDERESTIMATED: "border-blue-500/50 bg-blue-50 text-blue-800 dark:bg-blue-950/30 dark:text-blue-300",
};

const assessmentIcon = {
  REASONABLE: CircleCheck,
  OVERESTIMATED: TrendingDown,
  UNDERESTIMATED: TrendingUp,
};

export function PredictionReviewSection({ opportunityId, prediction }: { opportunityId: number; prediction: OpportunityPrediction }) {
  const { user } = useAuth();
  const mutation = useReviewPrediction(opportunityId);
  const [assessment, setAssessment] = useState<PredictionAssessment | "">("");
  const [comment, setComment] = useState("");
  const [saved, setSaved] = useState(false);
  const ownReview = prediction.reviews.find((review) => review.reviewerId === user?.id);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!assessment) return;
    await mutation.mutateAsync({ predictionId: prediction.id, assessment, comment: comment.trim() || undefined });
    setSaved(true);
  }

  return <section className="space-y-3 rounded-lg border border-dashed bg-muted/20 p-4" aria-labelledby={`prediction-review-${prediction.id}`}>
    <div>
      <h4 id={`prediction-review-${prediction.id}`} className="text-sm font-medium">Review prediction</h4>
      <p className="text-xs text-muted-foreground">Your judgment provides context; it does not change the probability or the opportunity outcome.</p>
    </div>
    {prediction.reviews.length > 0 && <div className="space-y-2">{prediction.reviews.map((review) => { const Icon = assessmentIcon[review.assessment]; return <div key={review.id} className="rounded-md border bg-background p-3 text-sm shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><Badge variant="outline" className={assessmentStyle[review.assessment]}><Icon className="mr-1 h-3.5 w-3.5" />{labels[review.assessment]}</Badge><span className="font-medium">{review.reviewer.firstName} {review.reviewer.lastName}</span></div><time className="text-xs text-muted-foreground">{new Date(review.createdAt).toLocaleString()}</time></div>
      {review.comment && <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{review.comment}</p>}
    </div>; })}</div>}
    {ownReview ? <p className="text-xs text-muted-foreground">Your review is saved with this immutable prediction.</p> : <form className="space-y-3 border-t pt-3" onSubmit={submit}>
      <div className="space-y-2"><Label htmlFor={`prediction-assessment-${prediction.id}`}>Assessment</Label><Select value={assessment} onValueChange={(value) => { setAssessment(value as PredictionAssessment); setSaved(false); }}><SelectTrigger id={`prediction-assessment-${prediction.id}`}><SelectValue placeholder="Select an assessment" /></SelectTrigger><SelectContent><SelectItem value="REASONABLE">Reasonable</SelectItem><SelectItem value="OVERESTIMATED">Overestimated</SelectItem><SelectItem value="UNDERESTIMATED">Underestimated</SelectItem></SelectContent></Select></div>
      <div className="space-y-2"><Label htmlFor={`prediction-comment-${prediction.id}`}>Comment <span className="font-normal text-muted-foreground">(optional)</span></Label><Textarea id={`prediction-comment-${prediction.id}`} value={comment} onChange={(event) => { setComment(event.target.value); setSaved(false); }} maxLength={1000} placeholder="Add business context for this assessment" /><p className="text-right text-xs text-muted-foreground">{comment.length}/1000</p></div>
      {mutation.error && <p role="alert" className="text-sm text-destructive">{mutation.error.message}</p>}
      {saved && <p role="status" className="text-sm text-emerald-700 dark:text-emerald-400">Review saved.</p>}
      <Button type="submit" size="sm" disabled={!assessment || mutation.isPending}>{mutation.isPending ? "Saving..." : "Submit feedback"}</Button>
    </form>}
  </section>;
}
