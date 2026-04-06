'use client'

import { Language, STEP_LABELS, PROTOCOL_TYPES, ProtocolType } from '@/types/protocol'

interface StepWizardProps {
  language: Language
  currentStep: number
  totalSteps: number
  protocolType: ProtocolType
  onNext: () => void
  onPrev: () => void
  onSubmit: () => void
  isSubmitting?: boolean
  children: React.ReactNode
}

export default function StepWizard({
  language,
  currentStep,
  totalSteps,
  protocolType,
  onNext,
  onPrev,
  onSubmit,
  isSubmitting = false,
  children,
}: StepWizardProps) {
  const labels = STEP_LABELS[language]
  const typeInfo = PROTOCOL_TYPES.find(t => t.id === protocolType)
  const visibleSteps = typeInfo?.steps || [1, 2, 3, 4, 5, 6]

  const isLastStep = currentStep === visibleSteps[visibleSteps.length - 1]
  const isFirstStep = currentStep === visibleSteps[0]

  const currentIndex = visibleSteps.indexOf(currentStep)

  const handleNext = () => {
    if (isLastStep) {
      onSubmit()
    } else {
      onNext()
    }
  }

  return (
    <>
      {/* Progress Bar */}
      <div className="progress-bar">
        {visibleSteps.map((step, i) => {
          let cls = 'progress-step'
          if (i < currentIndex) cls += ' done'
          if (step === currentStep) cls += ' active'
          return (
            <div key={step} className={cls} data-step={step} title={labels[step - 1]} />
          )
        })}
      </div>

      {/* Step Content */}
      <div className="form-section active">
        <div className="section-header">
          <span className="section-num">{currentIndex + 1}</span>
          <h2>{labels[currentStep - 1]}</h2>
        </div>
        {children}
      </div>

      {/* Bottom Navigation */}
      <div className="bottom-nav">
        {!isFirstStep && (
          <button
            type="button"
            className="btn btn-outline"
            onClick={onPrev}
            disabled={isSubmitting}
          >
            ← {language === 'sk' ? 'Späť' : 'Zpět'}
          </button>
        )}
        <button
          type="button"
          className={isLastStep ? 'btn btn-green' : 'btn btn-gold'}
          onClick={handleNext}
          disabled={isSubmitting}
          style={{ marginLeft: isFirstStep ? 'auto' : undefined }}
        >
          {isSubmitting
            ? (language === 'sk' ? 'Odosielam...' : 'Odesílám...')
            : isLastStep
              ? `✓ ${language === 'sk' ? 'Odoslať protokol' : 'Odeslat protokol'}`
              : `${language === 'sk' ? 'Ďalej' : 'Další'} →`
          }
        </button>
      </div>
    </>
  )
}
