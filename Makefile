# Tiện ích cho ai dùng make (Linux/macOS/git-bash). Windows: dùng scripts\*.ps1.
TF := terraform -chdir=infra

.PHONY: help up down plan status kube destroy

help:
	@echo "up      - init + apply + cấu hình kubectl"
	@echo "down    - destroy toàn bộ (ngừng tính tiền)"
	@echo "plan    - xem thay đổi"
	@echo "status  - kiểm tra tài nguyên đang tính tiền"
	@echo "kube    - cập nhật kubeconfig"

up:
	$(TF) init -input=false
	$(TF) apply -auto-approve -input=false
	$(MAKE) kube
	kubectl get nodes
	@echo "LAB ĐANG CHẠY — xong nhớ: make down"

plan:
	$(TF) init -input=false
	$(TF) plan

kube:
	aws eks update-kubeconfig --name $$($(TF) output -raw cluster_name) --region $$($(TF) output -raw region)

status:
	@aws eks list-clusters --query clusters --output text
	@aws ec2 describe-nat-gateways --filter "Name=state,Values=available" --query "NatGateways[].NatGatewayId" --output text

down destroy:
	$(TF) destroy -auto-approve -input=false
	@echo "Đã destroy. Kiểm tra lại Billing/EC2 cho chắc."
