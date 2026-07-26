variable "project_name" {
  description = "Project identifier used as a prefix for resource names"
  type        = string
}

variable "environment" {
  description = "Deployment environment (e.g. prod, staging, dev)"
  type        = string
}
