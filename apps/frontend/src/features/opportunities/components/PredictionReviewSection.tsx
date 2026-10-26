import { useState, type FormEvent } from "react";
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

  return <section className="space-y-3 border-t pt-4" aria-labelledby={`prediction-review-${prediction.id}`}>
    <div>
      <h4 id={`prediction-review-${prediction.id}`} className="text-sm font-medium">Review prediction</h4>
      <p className="text-xs text-muted-foreground">Your judgment provides context; it does not change the probability or the opportunity outcome.</p>
    </div>
    {prediction.reviews.length > 0 && <div className="space-y-2">{prediction.reviews.map((review) => <div key={review.id} className="rounded-md bg-muted/50 p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><Badge variant="outline">{labels[review.assessment]}</Badge><span className="font-medium">{review.reviewer.firstName} {review.reviewer.lastName}</span></div><time className="text-xs text-muted-foreground">{new Date(review.createdAt).toLocaleString()}</time></div>
      {review.comment && <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{review.comment}</p>}
    </div>)}</div>}
    {ownReview ? <p className="text-xs text-muted-foreground">You have already reviewed this saved prediction.</p> : <form className="space-y-3" onSubmit={submit}>
      <div className="space-y-2"><Label htmlFor={`prediction-assessment-${prediction.id}`}>Assessment</Label><Select value={assessment} onValueChange={(value) => { setAssessment(value as PredictionAssessment); setSaved(false); }}><SelectTrigger id={`prediction-assessment-${prediction.id}`}><SelectValue placeholder="Select an assessment" /></SelectTrigger><SelectContent><SelectItem value="REASONABLE">Reasonable</SelectItem><SelectItem value="OVERESTIMATED">Overestimated</SelectItem><SelectItem value="UNDERESTIMATED">Underestimated</SelectItem></SelectContent></Select></div>
      <div className="space-y-2"><Label htmlFor={`prediction-comment-${prediction.id}`}>Comment <span className="font-normal text-muted-foreground">(optional)</span></Label><Textarea id={`prediction-comment-${prediction.id}`} value={comment} onChange={(event) => { setComment(event.target.value); setSaved(false); }} maxLength={1000} placeholder="Add business context for this assessment" /><p className="text-right text-xs text-muted-foreground">{comment.length}/1000</p></div>
      {mutation.error && <p role="alert" className="text-sm text-destructive">{mutation.error.message}</p>}
      {saved && <p role="status" className="text-sm text-emerald-700 dark:text-emerald-400">Review saved.</p>}
      <Button type="submit" size="sm" disabled={!assessment || mutation.isPending}>{mutation.isPending ? "Saving..." : "Submit feedback"}</Button>
    </form>}
  </section>;
}
