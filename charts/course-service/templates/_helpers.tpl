{{- define "course-service.name" -}}
{{- .Chart.Name -}}
{{- end -}}

{{- define "course-service.labels" -}}
app.kubernetes.io/name: {{ include "course-service.name" . }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
helm.sh/chart: {{ .Chart.Name }}-{{ .Chart.Version }}
{{- end -}}

{{- define "course-service.selectorLabels" -}}
app.kubernetes.io/name: {{ include "course-service.name" . }}
{{- end -}}
