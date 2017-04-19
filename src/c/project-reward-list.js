import m from 'mithril';
import _ from 'underscore';
import I18n from 'i18n-js';
import h from '../h';
import rewardVM from '../vms/reward-vm';
import projectVM from '../vms/project-vm';

const I18nScope = _.partial(h.i18nScope, 'projects.contributions');

const projectRewardList = {
    controller() {
        const storeKey = 'selectedReward',
            vm = rewardVM,
            descriptionExtended = m.prop(0),
            selectedDestination = m.prop(''),
            toggleDescriptionExtended = (rewardId) => {
                if (descriptionExtended() === rewardId) {
                    descriptionExtended(0);
                } else {
                    descriptionExtended(rewardId);
                }

                return false;
            };

        const setInput = (el, isInitialized) => (!isInitialized ? el.focus() : false);

        const selectDestination = (destination) => {
            selectedDestination(destination);

            const shippingFee = vm.shippingFeeForCurrentReward(selectedDestination)
                ? Number(vm.shippingFeeForCurrentReward(selectedDestination).value)
                : 0;
            const rewardMinValue = Number(vm.selectedReward().minimum_value);
            vm.applyMask(`${shippingFee + rewardMinValue},00`);
        };

        const submitContribution = () => {
            const valueFloat = h.monetaryToFloat(vm.contributionValue);
            const shippingFee = rewardVM.hasShippingOptions(vm.selectedReward()) ? vm.shippingFeeForCurrentReward(selectedDestination) : { value: 0 };

            if (!selectedDestination() && rewardVM.hasShippingOptions(vm.selectedReward())) {
                vm.error('Por favor, selecione uma opção de frete válida.');
            } else if (valueFloat < vm.selectedReward().minimum_value + shippingFee.value) {
                vm.error(`O valor de apoio para essa recompensa deve ser de no mínimo R$${vm.selectedReward().minimum_value} + frete R$${h.formatNumber(shippingFee.value)}`);
            } else {
                vm.error('');
                h.navigateTo(`/projects/${projectVM.currentProject().project_id}/contributions/fallback_create?contribution%5Breward_id%5D=${vm.selectedReward().id}&contribution%5Bvalue%5D=${valueFloat}&contribution%5Bshipping_fee_id%5D=${shippingFee.id}`);
            }

            return false;
        };
        const isRewardOpened = reward => vm.selectedReward().id === reward.id;
        const isRewardDescriptionExtended = reward => descriptionExtended() === reward.id;
        if (h.getStoredObject(storeKey)) {
            const {
                value,
                reward
            } = h.getStoredObject(storeKey);

            h.removeStoredObject(storeKey);
            vm.selectedReward(reward);
            // vm.contributionValue(h.applyMonetaryMask(`${value},00`));
            vm.contributionValue(`${value}`);
            submitContribution();
        }

        vm.getStates();

        return {
            setInput,
            submitContribution,
            toggleDescriptionExtended,
            isRewardOpened,
            isRewardDescriptionExtended,
            selectDestination,
            selectedDestination,
            error: vm.error,
            applyMask: vm.applyMask,
            selectReward: vm.selectReward,
            locationOptions: vm.locationOptions,
            contributionValue: vm.contributionValue
        };
    },
    view(ctrl, args) {
        // FIXME: MISSING ADJUSTS
        // - add draft admin modifications
        // - move the cards to it's own component
        const project = args.project() || {
            open_for_contributions: false
        };
        return m('#rewards.reward.u-marginbottom-30', _.map(_.sortBy(args.rewardDetails(), reward => Number(reward.row_order)), reward => m(`div[class="${h.rewardSouldOut(reward) ? 'card-gone' : `card-reward ${project.open_for_contributions ? 'clickable' : ''}`} card card-secondary u-marginbottom-10"]`, {
            onclick: h.analytics.event({
                cat: 'contribution_create',
                act: 'contribution_reward_click',
                lbl: reward.minimum_value,
                project,
                extraData: {
                    reward_id: reward.id,
                    reward_value: reward.minimum_value
                }
            }, ctrl.selectReward(reward)),
            config: ctrl.isRewardOpened(reward) ? h.scrollTo() : Function.prototype
        }, [
            reward.minimum_value >= 1000 ? m('.tag-circle-installment', [
                m('.fontsize-smallest.fontweight-semibold.lineheight-tightest', '3x')
                // m('.fontsize-mini.lineheight-tightest', 's/ interest')
            ]) : '',
            m('.u-marginbottom-20', [
                m('.fontsize-base.fontweight-semibold', `Para R$ ${h.formatNumber(reward.minimum_value)} ou mais`)
            ]),

            m('.fontsize-smaller.u-margintop-20.reward-description', {
                class: ctrl.isRewardOpened(reward) ? `opened ${ctrl.isRewardDescriptionExtended(reward) ? 'extended' : ''}` : ''
            }, m.trust(h.simpleFormat(h.strip(reward.description)))),
            ctrl.isRewardOpened(reward) ? m('a[href="javascript:void(0);"].alt-link.fontsize-smallest.gray.link-more.u-marginbottom-20', {
                onclick: () => ctrl.toggleDescriptionExtended(reward.id)
            }, [
                ctrl.isRewardDescriptionExtended(reward) ? 'menos ' : 'mais ',
                m('span.fa.fa-angle-down', {
                    class: ctrl.isRewardDescriptionExtended(reward) ? 'reversed' : ''
                })
            ]) : '',
            m('.u-marginbottom-20.w-row', [
                m('.w-col.w-col-6', !_.isEmpty(reward.deliver_at) ? [
                    m('.fontcolor-secondary.fontsize-smallest',
                        m('span', 'Entrega prevista:')
                    ),
                    m('.fontsize-smallest',
                        h.momentify(reward.deliver_at, 'MMM/YYYY')
                    )
                ] : ''),
                m('.w-col.w-col-6', rewardVM.hasShippingOptions(reward) || reward.shipping_options === 'presential' ? [
                    m('.fontcolor-secondary.fontsize-smallest',
                        m('span',
                            'Envio:'
                        )
                    ),
                    m('.fontsize-smallest',
                        I18n.t(`shipping_options.${reward.shipping_options}`, I18nScope())
                    )
                ] : '')
            ]),
            reward.maximum_contributions > 0 ? [
                (h.rewardSouldOut(reward) ? m('.u-margintop-10', [
                    m('span.badge.badge-gone.fontsize-smaller', 'Esgotada')
                ]) : m('.u-margintop-10', [
                    m('span.badge.badge-attention.fontsize-smaller', [
                        m('span.fontweight-bold', 'Limitada'),
                        project.open_for_contributions ? ` (${h.rewardRemaning(reward)} de ${reward.maximum_contributions} disponíveis)` : ''
                    ])
                ]))
            ] : '',
            m('.fontcolor-secondary.fontsize-smallest.fontweight-semibold', h.pluralize(reward.paid_count, ' apoio', ' apoios')),
            reward.waiting_payment_count > 0 ? m('.maximum_contributions.in_time_to_confirm.clearfix', [
                m('.pending.fontsize-smallest.fontcolor-secondary', h.pluralize(reward.waiting_payment_count, ' apoio em prazo de confirmação', ' apoios em prazo de confirmação.'))
            ]) : '',
            project.open_for_contributions && !h.rewardSouldOut(reward) ? [
                ctrl.isRewardOpened(reward) ? m('.w-form', [
                    m('form.u-margintop-30', {
                        onsubmit: ctrl.submitContribution
                    }, [
                        m('.divider.u-marginbottom-20'),
                        rewardVM.hasShippingOptions(reward) ? m('div', [
                            m('.fontcolor-secondary.u-marginbottom-10',
                                'Local de entrega'
                            ),
                            m('select.positive.text-field.w-select', {
                                onchange: m.withAttr('value', ctrl.selectDestination),
                                value: ctrl.selectedDestination()
                            },
                                _.map(
                                    ctrl.locationOptions(reward, ctrl.selectedDestination),
                                    option => m(`option[value="${option.value}"]`,
                                        { selected: option.value === ctrl.selectedDestination() },
                                        [
                                            `${option.name} `,
                                            option.value != '' ? `+R$${option.fee}` : null
                                        ]
                                    )
                                )
                            )
                        ]) : '',
                        m('.fontcolor-secondary.u-marginbottom-10',
                            'Valor do apoio'
                        ),
                        m('.w-row.u-marginbottom-20', [
                            m('.w-col.w-col-3.w-col-small-3.w-col-tiny-3',
                                m('.back-reward-input-reward.placeholder', 'R$')
                            ),
                            m('.w-col.w-col-9.w-col-small-9.w-col-tiny-9',
                                m('input.w-input.back-reward-input-reward[type="tel"]', {
                                    config: ctrl.setInput,
                                    onkeyup: m.withAttr('value', ctrl.applyMask),
                                    value: ctrl.contributionValue()
                                })
                            )
                        ]),
                        m('input.w-button.btn.btn-medium[type="submit"][value="Continuar >"]'),
                        ctrl.error().length > 0 ? m('.text-error', [
                            m('br'),
                            m('span.fa.fa-exclamation-triangle'),
                            ` ${ctrl.error()}`
                        ]) : ''
                    ])
                ]) : ''
            ] : ''
        ])));
    }
};

export default projectRewardList;
