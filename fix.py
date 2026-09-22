import os

with open('app/(dashboard)/purchases/bills/new/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('export default function CreatePurchaseBillPage', 'export function PurchaseBillForm')
content = content.replace('const [isFullDesktop, setIsFullDesktop] = useState(true);', '')

idx = content.find('// Full Desktop View Mode')
if idx != -1:
    content = content[:idx] + 'return (<div className="max-w-7xl mx-auto space-y-6">{renderFormContent()}{renderAddItemModal()}<AddPartyModal isOpen={isAddPartyModalOpen} onClose={() => setIsAddPartyModalOpen(false)} onSave={handleSaveNewParty} /></div>); }'

os.makedirs('components/purchases', exist_ok=True)
with open('components/purchases/purchase-bill-form.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Done')
